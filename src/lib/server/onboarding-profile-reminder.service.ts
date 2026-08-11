import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import {
  PROFILE_REMINDER_BATCH_SIZE,
  PROFILE_REMINDER_LEASE_MS,
  PROFILE_REMINDER_MAX_ATTEMPTS,
  PROFILE_REMINDER_RETRY_DELAY_MS,
  PROFILE_REMINDER_TEMPLATE,
  isProfileReminderEligible,
  type ProfileReminderEligibilityReason,
} from "@/lib/server/onboarding-profile-reminder.model";
import {
  sendProfileReminderEmailWithResult,
  type SendEmailResult,
} from "@/lib/server/email.service";

const USERS_COLLECTION = "users";
const COMMUNICATIONS_COLLECTION = "communication_logs";

type ReminderRunOutcome = "SENT" | "FAILED" | "SKIPPED" | "CANCELLED";

export type ProfileReminderRunSummary = {
  eligible: number;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fullNameFromUser(data: Record<string, unknown>) {
  const fullName = safeString(data.fullName);

  if (fullName) {
    return fullName;
  }

  return [safeString(data.firstName), safeString(data.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim() || null;
}

function failedEmailResult(): SendEmailResult {
  return {
    sent: false,
    messageId: null,
    status: "SEND_FAILED",
    provider: "resend",
  };
}

function emailFailure(result: SendEmailResult, terminal: boolean) {
  const messages: Record<SendEmailResult["status"], string> = {
    SENT: "Profile reminder email sent.",
    EMAIL_NOT_CONFIGURED: "Email provider is not configured.",
    RECIPIENT_MISSING: "Profile reminder recipient is missing.",
    SEND_FAILED: "Email provider failed to send the profile reminder.",
  };

  return {
    code: result.status,
    message: messages[result.status],
    retryable: !terminal && result.status !== "RECIPIENT_MISSING",
  };
}

function shouldCancel(reason: ProfileReminderEligibilityReason) {
  return [
    "ACCOUNT_MISSING",
    "ACCOUNT_INACTIVE",
    "ACCOUNT_DISABLED",
    "EMAIL_UNVERIFIED",
    "EMAIL_MISSING",
    "EMAIL_MISMATCH",
    "EMAIL_SUPPRESSED",
    "PROFILE_COMPLETE",
  ].includes(reason);
}

async function cancelReminder(input: {
  communicationRef: FirebaseFirestore.DocumentReference;
  leaseId: string;
  reason: ProfileReminderEligibilityReason;
}) {
  const db = getAdminFirestore();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(input.communicationRef);

    if (!snapshot.exists || snapshot.get("leaseId") !== input.leaseId) {
      return;
    }

    transaction.set(
      input.communicationRef,
      {
        status: "CANCELLED",
        cancellationReason: input.reason,
        cancelledAt: FieldValue.serverTimestamp(),
        nextAttemptAt: null,
        updatedAt: FieldValue.serverTimestamp(),
        leaseId: null,
        leaseExpiresAt: null,
      },
      { merge: true },
    );
  });
}

async function finalizeFailure(input: {
  communicationRef: FirebaseFirestore.DocumentReference;
  leaseId: string;
  result: SendEmailResult;
  now: Date;
}) {
  const db = getAdminFirestore();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(input.communicationRef);

    if (!snapshot.exists || snapshot.get("leaseId") !== input.leaseId) {
      return;
    }

    const attemptCount = snapshot.get("attemptCount") as number;
    const terminal =
      attemptCount >= PROFILE_REMINDER_MAX_ATTEMPTS ||
      input.result.status === "RECIPIENT_MISSING";

    transaction.set(
      input.communicationRef,
      {
        status: "FAILED",
        failedAt: FieldValue.serverTimestamp(),
        nextAttemptAt: terminal
          ? null
          : new Date(input.now.getTime() + PROFILE_REMINDER_RETRY_DELAY_MS),
        updatedAt: FieldValue.serverTimestamp(),
        error: emailFailure(input.result, terminal),
        leaseId: null,
        leaseExpiresAt: null,
      },
      { merge: true },
    );
  });
}

async function acquireReminderLease(input: {
  communicationRef: FirebaseFirestore.DocumentReference;
  now: Date;
}) {
  const db = getAdminFirestore();
  const leaseId = randomUUID();
  const leaseExpiresAt = new Date(input.now.getTime() + PROFILE_REMINDER_LEASE_MS);

  return db.runTransaction(async (transaction) => {
    const communicationSnapshot = await transaction.get(input.communicationRef);

    if (!communicationSnapshot.exists) {
      return { acquired: false as const, outcome: "SKIPPED" as const };
    }

    const reminder = communicationSnapshot.data() as Record<string, unknown>;

    if (reminder.template !== PROFILE_REMINDER_TEMPLATE) {
      return { acquired: false as const, outcome: "SKIPPED" as const };
    }

    const uid = safeString(reminder.uid);
    const recipient = safeString(reminder.recipient);

    if (!uid) {
      return { acquired: false as const, outcome: "SKIPPED" as const };
    }

    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userSnapshot = await transaction.get(userRef);
    const user = userSnapshot.exists
      ? (userSnapshot.data() as Record<string, unknown>)
      : null;
    const eligibility = isProfileReminderEligible({
      reminder,
      user,
      auth: {
        disabled: false,
        emailVerified: true,
        email: recipient,
      },
      now: input.now,
    });

    if (!eligibility.eligible) {
      if (shouldCancel(eligibility.reason)) {
        transaction.set(
          input.communicationRef,
          {
            status: "CANCELLED",
            cancellationReason: eligibility.reason,
            cancelledAt: FieldValue.serverTimestamp(),
            nextAttemptAt: null,
            updatedAt: FieldValue.serverTimestamp(),
            leaseId: null,
            leaseExpiresAt: null,
          },
          { merge: true },
        );
        return { acquired: false as const, outcome: "CANCELLED" as const };
      }

      if (eligibility.reason === "MAX_ATTEMPTS_REACHED") {
        transaction.set(
          input.communicationRef,
          { status: "FAILED", nextAttemptAt: null, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }

      return { acquired: false as const, outcome: "SKIPPED" as const };
    }

    const attemptCount =
      typeof reminder.attemptCount === "number" ? reminder.attemptCount + 1 : 1;

    transaction.set(
      input.communicationRef,
      {
        status: "PROCESSING",
        attemptCount,
        lastAttemptAt: FieldValue.serverTimestamp(),
        nextAttemptAt: leaseExpiresAt,
        updatedAt: FieldValue.serverTimestamp(),
        error: null,
        leaseId,
        leaseExpiresAt,
      },
      { merge: true },
    );

    return {
      acquired: true as const,
      uid,
      recipient: recipient!,
      idempotencyKey: safeString(reminder.idempotencyKey)!,
      leaseId,
    };
  });
}

async function processReminder(
  communicationRef: FirebaseFirestore.DocumentReference,
  now: Date,
): Promise<ReminderRunOutcome> {
  const claim = await acquireReminderLease({ communicationRef, now });

  if (!claim.acquired) {
    return claim.outcome;
  }

  let authState: { disabled: boolean; emailVerified: boolean; email: string | null };

  try {
    const authUser = await getAdminAuth().getUser(claim.uid);
    authState = {
      disabled: authUser.disabled,
      emailVerified: authUser.emailVerified,
      email: authUser.email ?? null,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "AUTH_LOOKUP_FAILED";

    if (code === "auth/user-not-found") {
      await cancelReminder({
        communicationRef,
        leaseId: claim.leaseId,
        reason: "ACCOUNT_MISSING",
      });
      return "CANCELLED";
    }

    await finalizeFailure({
      communicationRef,
      leaseId: claim.leaseId,
      result: failedEmailResult(),
      now,
    });
    return "FAILED";
  }

  const db = getAdminFirestore();
  const finalCheck = await db.runTransaction(async (transaction) => {
    const communicationSnapshot = await transaction.get(communicationRef);

    if (
      !communicationSnapshot.exists ||
      communicationSnapshot.get("leaseId") !== claim.leaseId
    ) {
      return { eligible: false as const, reason: "INVALID_REMINDER" as const };
    }

    const userRef = db.collection(USERS_COLLECTION).doc(claim.uid);
    const userSnapshot = await transaction.get(userRef);
    const user = userSnapshot.exists
      ? (userSnapshot.data() as Record<string, unknown>)
      : null;
    const reminder = communicationSnapshot.data() as Record<string, unknown>;
    const claimedAttemptCount =
      typeof reminder.attemptCount === "number" ? reminder.attemptCount : 1;
    const eligibility = isProfileReminderEligible({
      reminder: {
        ...reminder,
        status: "PENDING",
        attemptCount: Math.max(0, claimedAttemptCount - 1),
        nextAttemptAt: reminder.dueAt,
      },
      user,
      auth: authState,
      now,
    });

    return {
      ...eligibility,
      fullName: user ? fullNameFromUser(user) : null,
    };
  });

  if (!finalCheck.eligible) {
    if (shouldCancel(finalCheck.reason)) {
      await cancelReminder({
        communicationRef,
        leaseId: claim.leaseId,
        reason: finalCheck.reason,
      });
      return "CANCELLED";
    }

    return "SKIPPED";
  }

  let emailResult: SendEmailResult;

  try {
    emailResult = await sendProfileReminderEmailWithResult(
      { email: claim.recipient, fullName: finalCheck.fullName },
      claim.idempotencyKey,
    );
  } catch {
    emailResult = failedEmailResult();
  }

  if (!emailResult.sent) {
    await finalizeFailure({
      communicationRef,
      leaseId: claim.leaseId,
      result: emailResult,
      now,
    });
    return "FAILED";
  }

  await db.runTransaction(async (transaction) => {
    const communicationSnapshot = await transaction.get(communicationRef);

    if (
      !communicationSnapshot.exists ||
      communicationSnapshot.get("leaseId") !== claim.leaseId
    ) {
      return;
    }

    transaction.set(
      communicationRef,
      {
        status: "SENT",
        messageId: emailResult.messageId,
        providerMessageId: emailResult.messageId,
        sentAt: FieldValue.serverTimestamp(),
        failedAt: null,
        nextAttemptAt: null,
        updatedAt: FieldValue.serverTimestamp(),
        error: null,
        leaseId: null,
        leaseExpiresAt: null,
      },
      { merge: true },
    );
  });

  return "SENT";
}

export async function processDueProfileReminders(input?: {
  now?: Date;
  batchSize?: number;
}): Promise<ProfileReminderRunSummary> {
  const db = getAdminFirestore();
  const now = input?.now ?? new Date();
  const batchSize = Math.max(
    1,
    Math.min(input?.batchSize ?? PROFILE_REMINDER_BATCH_SIZE, PROFILE_REMINDER_BATCH_SIZE),
  );
  const snapshot = await db
    .collection(COMMUNICATIONS_COLLECTION)
    .where("nextAttemptAt", "<=", now)
    .orderBy("nextAttemptAt", "asc")
    .limit(batchSize)
    .get();
  const summary: ProfileReminderRunSummary = {
    eligible: 0,
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  };

  for (const document of snapshot.docs) {
    const data = document.data() as Record<string, unknown>;

    if (data.template !== PROFILE_REMINDER_TEMPLATE) {
      summary.skipped += 1;
      continue;
    }

    summary.eligible += 1;
    const outcome = await processReminder(document.ref, now);

    if (outcome === "SENT") {
      summary.processed += 1;
      summary.sent += 1;
    } else if (outcome === "FAILED") {
      summary.processed += 1;
      summary.failed += 1;
    } else if (outcome === "CANCELLED") {
      summary.cancelled += 1;
    } else {
      summary.skipped += 1;
    }
  }

  console.info("[profile-reminder] Run completed", summary);
  return summary;
}
