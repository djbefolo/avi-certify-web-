import "server-only";

import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  sendWelcomeEmailWithResult,
  type SendEmailResult,
} from "@/lib/server/email.service";
import {
  linkLeadToVerifiedUser,
  type LeadUserLinkingStatus,
} from "@/lib/server/lead-user-linking.service";

const USERS_COLLECTION = "users";
const COMMUNICATIONS_COLLECTION = "communication_logs";
const WELCOME_TEMPLATE = "auth_welcome";
const WELCOME_LEASE_MS = 5 * 60 * 1000;

export const AUTH_WELCOME_IDEMPOTENCY_PREFIX = "auth_welcome";

type WelcomeState = "SENT" | "FAILED" | "PENDING";

export type CompletePostVerificationInput = {
  uid: string;
  email: string;
  emailVerified: true;
};

export type CompletePostVerificationResult = {
  uid: string;
  profileRecovered: boolean;
  emailVerifiedTransitionCreated: boolean;
  welcomeStatus: WelcomeState;
  welcomeSent: boolean;
  leadLinkStatus: LeadUserLinkingStatus | "ERROR";
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fullNameFromProfile(data: Record<string, unknown>) {
  const fullName = safeString(data.fullName);

  if (fullName) {
    return fullName;
  }

  const derived = [safeString(data.firstName), safeString(data.lastName)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return derived || null;
}

function toMillis(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function emailFailure(result: SendEmailResult) {
  const messages: Record<SendEmailResult["status"], string> = {
    SENT: "Welcome email sent.",
    EMAIL_NOT_CONFIGURED: "Email provider is not configured.",
    RECIPIENT_MISSING: "Welcome email recipient is missing.",
    SEND_FAILED: "Email provider failed to send the welcome email.",
  };

  return {
    code: result.status,
    message: messages[result.status],
    retryable: result.status !== "RECIPIENT_MISSING",
  };
}

function failedEmailResult(): SendEmailResult {
  return {
    sent: false,
    messageId: null,
    status: "SEND_FAILED",
    provider: "resend",
  };
}

export function authWelcomeCommunicationId(uid: string) {
  return `${AUTH_WELCOME_IDEMPOTENCY_PREFIX}_${uid}`;
}

export function authWelcomeIdempotencyKey(uid: string) {
  return `${AUTH_WELCOME_IDEMPOTENCY_PREFIX}:${uid}`;
}

async function attemptLeadIdentityLinking(
  input: CompletePostVerificationInput,
): Promise<LeadUserLinkingStatus | "ERROR"> {
  try {
    const result = await linkLeadToVerifiedUser({
      uid: input.uid,
      email: input.email,
      emailVerified: input.emailVerified,
    });

    return result.status;
  } catch (error) {
    console.warn("[onboarding] Lead identity linking failed", {
      uid: input.uid,
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "UNEXPECTED_ERROR",
    });

    return "ERROR";
  }
}

export async function completePostVerification(
  input: CompletePostVerificationInput,
): Promise<CompletePostVerificationResult> {
  const db = getAdminFirestore();
  const userRef = db.collection(USERS_COLLECTION).doc(input.uid);
  const communicationId = authWelcomeCommunicationId(input.uid);
  const communicationRef = db
    .collection(COMMUNICATIONS_COLLECTION)
    .doc(communicationId);
  const email = normalizeEmail(input.email);
  const idempotencyKey = authWelcomeIdempotencyKey(input.uid);
  const leaseId = randomUUID();
  const now = new Date();

  const claim = await db.runTransaction(async (transaction) => {
    const [userSnapshot, communicationSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(communicationRef),
    ]);
    const userData = userSnapshot.exists
      ? (userSnapshot.data() as Record<string, unknown>)
      : null;
    const communicationData = communicationSnapshot.exists
      ? (communicationSnapshot.data() as Record<string, unknown>)
      : null;
    const transitionCreated = !userData?.emailVerifiedAt;

    if (userData) {
      if (transitionCreated) {
        transaction.update(userRef, {
          emailVerifiedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      transaction.create(userRef, {
        uid: input.uid,
        email,
        role: "student",
        status: "active",
        createdVia: "post_verification_recovery",
        profileSource: "firebase_auth",
        clientOrigin: "web_app",
        marketingConsent: false,
        marketingConsentAt: null,
        emailVerifiedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (communicationData?.status === "SENT") {
      return {
        acquired: false,
        profileRecovered: !userData,
        transitionCreated,
        fullName: fullNameFromProfile(userData ?? {}),
        status: "SENT" as const,
      };
    }

    const leaseIsActive =
      communicationData?.status === "PENDING" &&
      toMillis(communicationData.leaseExpiresAt) > now.getTime();

    if (leaseIsActive) {
      return {
        acquired: false,
        profileRecovered: !userData,
        transitionCreated,
        fullName: fullNameFromProfile(userData ?? {}),
        status: "PENDING" as const,
      };
    }

    const attemptCount =
      typeof communicationData?.attemptCount === "number"
        ? communicationData.attemptCount + 1
        : 1;
    const pendingData = {
      id: communicationId,
      caseId: null,
      uid: input.uid,
      type: "EMAIL",
      template: WELCOME_TEMPLATE,
      recipient: email,
      status: "PENDING",
      provider: "resend",
      messageId: safeString(communicationData?.messageId),
      providerMessageId: safeString(communicationData?.providerMessageId),
      idempotencyKey,
      attemptCount,
      lastAttemptAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      sentAt: communicationData?.sentAt ?? null,
      failedAt: null,
      error: null,
      leaseId,
      leaseExpiresAt: new Date(now.getTime() + WELCOME_LEASE_MS),
    };

    if (communicationSnapshot.exists) {
      transaction.set(communicationRef, pendingData, { merge: true });
    } else {
      transaction.create(communicationRef, {
        ...pendingData,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      acquired: true,
      profileRecovered: !userData,
      transitionCreated,
      fullName: fullNameFromProfile(userData ?? {}),
      status: "PENDING" as const,
    };
  });
  const leadLinkStatus = await attemptLeadIdentityLinking(input);

  if (!claim.acquired) {
    return {
      uid: input.uid,
      profileRecovered: claim.profileRecovered,
      emailVerifiedTransitionCreated: claim.transitionCreated,
      welcomeStatus: claim.status,
      welcomeSent: claim.status === "SENT",
      leadLinkStatus,
    };
  }

  let emailResult: SendEmailResult;

  try {
    emailResult = await sendWelcomeEmailWithResult(
      { email, fullName: claim.fullName },
      idempotencyKey,
    );
  } catch {
    emailResult = failedEmailResult();
  }

  const welcomeStatus = emailResult.sent ? "SENT" : "FAILED";

  await db.runTransaction(async (transaction) => {
    const communicationSnapshot = await transaction.get(communicationRef);

    if (
      !communicationSnapshot.exists ||
      communicationSnapshot.get("leaseId") !== leaseId
    ) {
      return;
    }

    transaction.set(
      communicationRef,
      {
        status: welcomeStatus,
        messageId: emailResult.messageId,
        providerMessageId: emailResult.messageId,
        sentAt: emailResult.sent ? FieldValue.serverTimestamp() : null,
        failedAt: emailResult.sent ? null : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        error: emailResult.sent ? null : emailFailure(emailResult),
        leaseId: null,
        leaseExpiresAt: null,
      },
      { merge: true },
    );
  });

  return {
    uid: input.uid,
    profileRecovered: claim.profileRecovered,
    emailVerifiedTransitionCreated: claim.transitionCreated,
    welcomeStatus,
    welcomeSent: emailResult.sent,
    leadLinkStatus,
  };
}
