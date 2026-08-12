import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import type {
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeLeadEmail } from "@/lib/leads/normalize-lead";
import { isProfileCompleteForReminder } from "@/lib/server/onboarding-profile-reminder.model";
import {
  HUMAN_FOLLOW_UP_ADMIN_SOURCE,
  HUMAN_FOLLOW_UP_BATCH_SIZE,
  HUMAN_FOLLOW_UP_NEXT_ACTION,
  HUMAN_FOLLOW_UP_QUERY_LIMIT,
  HUMAN_FOLLOW_UP_REASON,
  HUMAN_FOLLOW_UP_SOURCE,
  canClearSystemHumanFollowUp,
  decideHumanFollowUpAssignment,
  humanFollowUpEscalationEventId,
  humanFollowUpNotificationId,
  humanFollowUpResolutionEventId,
  isHumanFollowUpEligible,
  resolveHumanFollowUpIdentity,
  type HumanFollowUpEligibilityReason,
  type HumanFollowUpIdentityResolution,
  type HumanFollowUpLeadCandidate,
} from "@/lib/server/onboarding-human-followup.model";

const USERS_COLLECTION = "users";
const LEADS_COLLECTION = "leads";
const COMMUNICATIONS_COLLECTION = "communication_logs";
const ADMIN_NOTIFICATIONS_COLLECTION = "admin_notifications";
const ADMIN_EVENTS_COLLECTION = "admin_case_events";

type CandidateWithRef = HumanFollowUpLeadCandidate & {
  ref: DocumentReference<DocumentData>;
};

type AuthState = {
  disabled: boolean;
  emailVerified: boolean;
  email: string | null;
};

type EscalationOutcome =
  | "ESCALATED"
  | "REVIEW_REQUIRED"
  | "CANCELLED"
  | "SKIPPED"
  | "FAILED";

type ResolutionOutcome = "RESOLVED" | "SKIPPED";

export type HumanFollowUpRunSummary = {
  due: number;
  processed: number;
  escalated: number;
  reviewRequired: number;
  resolved: number;
  cancelled: number;
  skipped: number;
  failed: number;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function candidateFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): CandidateWithRef {
  return {
    id: snapshot.id,
    ref: snapshot.ref,
    data: snapshot.data() as Record<string, unknown>,
  };
}

async function findCandidateLeads(
  transaction: Transaction,
  uid: string,
  email: string,
) {
  const db = getAdminFirestore();
  const leads = db.collection(LEADS_COLLECTION);
  const normalizedEmail = normalizeLeadEmail(email);
  const queries = [
    leads.where("linkedUid", "==", uid).limit(HUMAN_FOLLOW_UP_QUERY_LIMIT),
    leads
      .where("normalizedEmail", "==", normalizedEmail)
      .limit(HUMAN_FOLLOW_UP_QUERY_LIMIT),
    leads.where("email", "==", normalizedEmail).limit(HUMAN_FOLLOW_UP_QUERY_LIMIT),
  ];
  const snapshots = await Promise.all(
    queries.map((query) => transaction.get(query)),
  );
  const candidates = new Map<string, CandidateWithRef>();

  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      candidates.set(document.id, candidateFromSnapshot(document));
    }
  }

  return [...candidates.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function shouldCancel(reason: HumanFollowUpEligibilityReason) {
  return [
    "ACCOUNT_MISSING",
    "ACCOUNT_INACTIVE",
    "ACCOUNT_DISABLED",
    "EMAIL_UNVERIFIED",
    "EMAIL_MISSING",
    "EMAIL_MISMATCH",
    "PROFILE_COMPLETE",
  ].includes(reason);
}

function notificationBody(
  resolution: HumanFollowUpIdentityResolution,
  assignmentDecision: string | null,
) {
  if (resolution === "LINKED" && assignmentDecision === "ASSIGN") {
    return "Le profil reste incomplet 72 h apres la relance. Un suivi humain est requis.";
  }

  if (resolution === "LINKED") {
    return "Le profil reste incomplet, mais une action humaine existante a ete preservee.";
  }

  return `Le profil reste incomplet et le rapprochement CRM requiert une revue (${resolution}).`;
}

async function loadAuthState(uid: string): Promise<AuthState | null> {
  try {
    const authUser = await getAdminAuth().getUser(uid);
    return {
      disabled: authUser.disabled,
      emailVerified: authUser.emailVerified,
      email: authUser.email ?? null,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : null;

    if (code === "auth/user-not-found") {
      return null;
    }

    throw error;
  }
}

async function processDueEscalation(
  document: QueryDocumentSnapshot<DocumentData>,
  now: Date,
): Promise<EscalationOutcome> {
  const initial = document.data() as Record<string, unknown>;
  const uid = safeString(initial.uid);

  if (!uid) {
    return "SKIPPED";
  }

  let auth: AuthState | null;

  try {
    auth = await loadAuthState(uid);
  } catch {
    return "FAILED";
  }

  const db = getAdminFirestore();

  return db.runTransaction(async (transaction) => {
    const reminderSnapshot = await transaction.get(document.ref);
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userSnapshot = await transaction.get(userRef);
    const reminder = reminderSnapshot.exists
      ? (reminderSnapshot.data() as Record<string, unknown>)
      : null;
    const user = userSnapshot.exists
      ? (userSnapshot.data() as Record<string, unknown>)
      : null;

    if (!auth) {
      if (reminderSnapshot.exists) {
        transaction.set(
          document.ref,
          {
            humanFollowUpStatus: "CANCELLED",
            humanFollowUpDueAt: null,
            humanFollowUpCancellationReason: "ACCOUNT_MISSING",
            humanFollowUpCancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
      return "CANCELLED";
    }

    const eligibility = isHumanFollowUpEligible({ reminder, user, auth, now });

    if (!eligibility.eligible) {
      if (reminderSnapshot.exists && shouldCancel(eligibility.reason)) {
        transaction.set(
          document.ref,
          {
            humanFollowUpStatus: "CANCELLED",
            humanFollowUpDueAt: null,
            humanFollowUpCancellationReason: eligibility.reason,
            humanFollowUpCancelledAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return "CANCELLED";
      }

      return "SKIPPED";
    }

    const email = auth.email!;
    const candidates = await findCandidateLeads(transaction, uid, email);
    const identity = resolveHumanFollowUpIdentity(uid, candidates);
    const notificationId = humanFollowUpNotificationId(uid);
    const eventId = humanFollowUpEscalationEventId(uid);
    const notificationRef = db
      .collection(ADMIN_NOTIFICATIONS_COLLECTION)
      .doc(notificationId);
    const eventRef = db.collection(ADMIN_EVENTS_COLLECTION).doc(eventId);
    const [notificationSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(notificationRef),
      transaction.get(eventRef),
    ]);
    const assignmentDecision = identity.lead
      ? decideHumanFollowUpAssignment(identity.lead.data)
      : null;
    const timestamp = now.toISOString();

    if (identity.lead && assignmentDecision === "ASSIGN") {
      transaction.set(
        identity.lead.ref,
        {
          nextAction: HUMAN_FOLLOW_UP_NEXT_ACTION,
          nextActionDueAt: timestamp,
          followUpReason: HUMAN_FOLLOW_UP_REASON,
          nextActionSource: HUMAN_FOLLOW_UP_SOURCE,
          nextActionUpdatedAt: timestamp,
          nextActionUpdatedBy: "system:onboarding-human-followup",
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }

    if (!notificationSnapshot.exists) {
      transaction.create(notificationRef, {
        id: notificationId,
        type: "admin_action_required",
        severity: "warning",
        title: "Suivi humain requis - profil incomplet",
        body: notificationBody(identity.resolution, assignmentDecision),
        relatedUid: uid,
        relatedCaseId: null,
        read: false,
        resolved: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          category: "onboarding_human_followup",
          reason: HUMAN_FOLLOW_UP_REASON,
          reminderId: document.id,
          leadId: identity.lead?.id ?? null,
          identityResolution: identity.resolution,
          assignmentDecision,
        },
      });
    }

    if (!eventSnapshot.exists) {
      transaction.create(eventRef, {
        id: eventId,
        caseId: null,
        uid,
        actorType: "system",
        actorId: "onboarding-human-followup",
        actorRole: "system",
        eventType: "profile_human_followup_escalated",
        eventLabel: "Suivi humain onboarding requis",
        eventPayload: {
          reason: HUMAN_FOLLOW_UP_REASON,
          reminderId: document.id,
          leadId: identity.lead?.id ?? null,
          identityResolution: identity.resolution,
          assignmentDecision,
        },
        createdAt: timestamp,
      });
    }

    transaction.set(
      document.ref,
      {
        humanFollowUpStatus: "ACTIVE",
        humanFollowUpDueAt: null,
        humanFollowUpEscalatedAt: FieldValue.serverTimestamp(),
        humanFollowUpLeadId: identity.lead?.id ?? null,
        humanFollowUpIdentityResolution: identity.resolution,
        humanFollowUpAssignmentDecision: assignmentDecision,
        humanFollowUpNotificationId: notificationId,
        humanFollowUpEventId: eventId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return identity.resolution === "LINKED"
      ? "ESCALATED"
      : "REVIEW_REQUIRED";
  });
}

async function processActiveResolution(
  document: QueryDocumentSnapshot<DocumentData>,
  now: Date,
): Promise<ResolutionOutcome> {
  const initial = document.data() as Record<string, unknown>;
  const uid = safeString(initial.uid);

  if (!uid) {
    return "SKIPPED";
  }

  const db = getAdminFirestore();

  return db.runTransaction(async (transaction) => {
    const reminderSnapshot = await transaction.get(document.ref);

    if (
      !reminderSnapshot.exists ||
      reminderSnapshot.get("humanFollowUpStatus") !== "ACTIVE"
    ) {
      return "SKIPPED";
    }

    const reminder = reminderSnapshot.data() as Record<string, unknown>;
    const userRef = db.collection(USERS_COLLECTION).doc(uid);
    const userSnapshot = await transaction.get(userRef);
    const user = userSnapshot.exists
      ? (userSnapshot.data() as Record<string, unknown>)
      : null;

    if (!user || !isProfileCompleteForReminder(user)) {
      return "SKIPPED";
    }

    const leadId = safeString(reminder.humanFollowUpLeadId);
    const notificationId =
      safeString(reminder.humanFollowUpNotificationId) ??
      humanFollowUpNotificationId(uid);
    const notificationRef = db
      .collection(ADMIN_NOTIFICATIONS_COLLECTION)
      .doc(notificationId);
    const eventRef = db
      .collection(ADMIN_EVENTS_COLLECTION)
      .doc(humanFollowUpResolutionEventId(uid));
    const leadRef = leadId ? db.collection(LEADS_COLLECTION).doc(leadId) : null;
    const [leadSnapshot, notificationSnapshot, eventSnapshot] = await Promise.all([
      leadRef ? transaction.get(leadRef) : Promise.resolve(null),
      transaction.get(notificationRef),
      transaction.get(eventRef),
    ]);
    const lead = leadSnapshot?.exists
      ? (leadSnapshot.data() as Record<string, unknown>)
      : null;
    const clearSystemAction = canClearSystemHumanFollowUp(lead);
    const timestamp = now.toISOString();

    if (leadRef && lead && clearSystemAction) {
      transaction.set(
        leadRef,
        {
          nextAction: "NONE",
          nextActionDueAt: null,
          followUpReason: null,
          nextActionSource: null,
          nextActionUpdatedAt: timestamp,
          nextActionUpdatedBy: "system:onboarding-human-followup",
          systemFollowUpResolvedAt: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }

    if (notificationSnapshot.exists) {
      transaction.set(
        notificationRef,
        {
          read: true,
          resolved: true,
          resolvedAt: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }

    if (!eventSnapshot.exists) {
      transaction.create(eventRef, {
        id: eventRef.id,
        caseId: null,
        uid,
        actorType: "system",
        actorId: "onboarding-human-followup",
        actorRole: "system",
        eventType: "profile_human_followup_resolved",
        eventLabel: "Suivi humain onboarding resolu",
        eventPayload: {
          reason: "PROFILE_COMPLETED",
          reminderId: document.id,
          leadId,
          systemActionCleared: clearSystemAction,
          humanActionPreserved:
            Boolean(lead) &&
            lead?.nextActionSource === HUMAN_FOLLOW_UP_ADMIN_SOURCE,
        },
        createdAt: timestamp,
      });
    }

    transaction.set(
      document.ref,
      {
        humanFollowUpStatus: "RESOLVED",
        humanFollowUpResolvedAt: FieldValue.serverTimestamp(),
        humanFollowUpResolutionReason: "PROFILE_COMPLETED",
        humanFollowUpSystemActionCleared: clearSystemAction,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return "RESOLVED";
  });
}

export async function processOnboardingHumanFollowUps(input?: {
  now?: Date;
  batchSize?: number;
}): Promise<HumanFollowUpRunSummary> {
  const db = getAdminFirestore();
  const now = input?.now ?? new Date();
  const batchSize = Math.max(
    1,
    Math.min(
      input?.batchSize ?? HUMAN_FOLLOW_UP_BATCH_SIZE,
      HUMAN_FOLLOW_UP_BATCH_SIZE,
    ),
  );
  const [dueSnapshot, activeSnapshot] = await Promise.all([
    db
      .collection(COMMUNICATIONS_COLLECTION)
      .where("humanFollowUpDueAt", "<=", now)
      .orderBy("humanFollowUpDueAt", "asc")
      .limit(batchSize)
      .get(),
    db
      .collection(COMMUNICATIONS_COLLECTION)
      .where("humanFollowUpStatus", "==", "ACTIVE")
      .limit(batchSize)
      .get(),
  ]);
  const summary: HumanFollowUpRunSummary = {
    due: dueSnapshot.docs.length,
    processed: 0,
    escalated: 0,
    reviewRequired: 0,
    resolved: 0,
    cancelled: 0,
    skipped: 0,
    failed: 0,
  };

  for (const document of dueSnapshot.docs) {
    const outcome = await processDueEscalation(document, now);

    if (outcome === "ESCALATED") {
      summary.processed += 1;
      summary.escalated += 1;
    } else if (outcome === "REVIEW_REQUIRED") {
      summary.processed += 1;
      summary.reviewRequired += 1;
    } else if (outcome === "CANCELLED") {
      summary.cancelled += 1;
    } else if (outcome === "FAILED") {
      summary.failed += 1;
    } else {
      summary.skipped += 1;
    }
  }

  for (const document of activeSnapshot.docs) {
    const outcome = await processActiveResolution(document, now);

    if (outcome === "RESOLVED") {
      summary.processed += 1;
      summary.resolved += 1;
    } else {
      summary.skipped += 1;
    }
  }

  console.info("[onboarding-human-followup] Run completed", summary);
  return summary;
}
