import "server-only";

import { createHash } from "node:crypto";
import {
  FieldValue,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeLeadEmail } from "@/lib/leads/normalize-lead";

const LEADS_COLLECTION = "leads";
const ADMIN_NOTIFICATIONS_COLLECTION = "admin_notifications";
const QUERY_LIMIT = 3;

export const VERIFIED_EMAIL_LINK_METHOD = "VERIFIED_EMAIL";

export type LeadUserLinkingStatus =
  | "NO_MATCH"
  | "LINKED"
  | "ALREADY_LINKED"
  | "AMBIGUOUS"
  | "CONFLICT";

export type LinkLeadToVerifiedUserInput = {
  uid: string;
  email: string;
  emailVerified: boolean;
};

export type LeadUserLinkingResult = {
  status: LeadUserLinkingStatus;
};

type ReviewReason =
  | "MULTIPLE_MATCHES"
  | "LEAD_ALREADY_LINKED_TO_DIFFERENT_UID"
  | "EXISTING_IDENTITY_AMBIGUITY"
  | "EXISTING_IDENTITY_CONFLICT"
  | "MALFORMED_EXISTING_LINK";

type CandidateLead = {
  id: string;
  ref: DocumentReference<DocumentData>;
  data: Record<string, unknown>;
};

export class LeadUserLinkingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UID_REQUIRED"
      | "EMAIL_REQUIRED"
      | "EMAIL_NOT_VERIFIED",
  ) {
    super(message);
  }
}

function cleanUid(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function notificationId(
  uid: string,
  normalizedEmail: string,
  reason: ReviewReason,
) {
  const digest = createHash("sha256")
    .update(`${uid}:${normalizedEmail}:${reason}`)
    .digest("hex")
    .slice(0, 24);

  return `lead_link_review_${digest}`;
}

function candidateFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): CandidateLead {
  return {
    id: snapshot.id,
    ref: snapshot.ref,
    data: snapshot.data() as Record<string, unknown>,
  };
}

async function findCandidateLeads(
  transaction: Transaction,
  db: Firestore,
  normalizedEmail: string,
) {
  const leads = db.collection(LEADS_COLLECTION);
  const canonicalQuery = leads
    .where("normalizedEmail", "==", normalizedEmail)
    .limit(QUERY_LIMIT);
  const legacyQuery = leads
    .where("email", "==", normalizedEmail)
    .limit(QUERY_LIMIT);
  const [canonicalSnapshot, legacySnapshot] = await Promise.all([
    transaction.get(canonicalQuery),
    transaction.get(legacyQuery),
  ]);
  const candidates = new Map<string, CandidateLead>();

  for (const snapshot of [
    ...canonicalSnapshot.docs,
    ...legacySnapshot.docs,
  ]) {
    candidates.set(snapshot.id, candidateFromSnapshot(snapshot));
  }

  return [...candidates.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

async function createReviewNotification(
  transaction: Transaction,
  db: Firestore,
  input: {
    uid: string;
    normalizedEmail: string;
    reason: ReviewReason;
    candidateLeadIds: string[];
  },
) {
  const id = notificationId(
    input.uid,
    input.normalizedEmail,
    input.reason,
  );
  const notificationRef = db
    .collection(ADMIN_NOTIFICATIONS_COLLECTION)
    .doc(id);
  const existing = await transaction.get(notificationRef);
  const timestamp = new Date().toISOString();
  const notification = {
    id,
    type: "admin_action_required",
    severity: input.reason === "MULTIPLE_MATCHES" ? "warning" : "critical",
    title: "Revue de rapprochement lead requise",
    body: `Le rapprochement d'identite requiert une revue admin (${input.reason}).`,
    relatedUid: input.uid,
    relatedCaseId: null,
    updatedAt: timestamp,
    metadata: {
      category: "lead_identity_linking",
      reason: input.reason,
      normalizedEmail: input.normalizedEmail,
      candidateLeadIds: input.candidateLeadIds,
      candidateCount: input.candidateLeadIds.length,
    },
  };

  if (existing.exists) {
    transaction.set(notificationRef, notification, { merge: true });
    return;
  }

  transaction.create(notificationRef, {
    ...notification,
    read: false,
    createdAt: timestamp,
  });
}

async function classifyAndLink(
  transaction: Transaction,
  db: Firestore,
  input: { uid: string; normalizedEmail: string },
): Promise<LeadUserLinkingResult> {
  const candidates = await findCandidateLeads(
    transaction,
    db,
    input.normalizedEmail,
  );

  if (candidates.length === 0) {
    return { status: "NO_MATCH" };
  }

  if (candidates.length > 1) {
    await createReviewNotification(transaction, db, {
      ...input,
      reason: "MULTIPLE_MATCHES",
      candidateLeadIds: candidates.map((candidate) => candidate.id),
    });

    return { status: "AMBIGUOUS" };
  }

  const candidate = candidates[0];
  const existingLinkedUid = stringOrNull(candidate.data.linkedUid);
  const rawLinkedUidPresent = candidate.data.linkedUid != null;
  const existingIdentityStatus = stringOrNull(
    candidate.data.identityLinkStatus,
  )?.toUpperCase();

  if (existingIdentityStatus === "AMBIGUOUS") {
    await createReviewNotification(transaction, db, {
      ...input,
      reason: "EXISTING_IDENTITY_AMBIGUITY",
      candidateLeadIds: [candidate.id],
    });

    return { status: "AMBIGUOUS" };
  }

  if (existingIdentityStatus === "CONFLICT") {
    await createReviewNotification(transaction, db, {
      ...input,
      reason: "EXISTING_IDENTITY_CONFLICT",
      candidateLeadIds: [candidate.id],
    });

    return { status: "CONFLICT" };
  }

  if (rawLinkedUidPresent && !existingLinkedUid) {
    await createReviewNotification(transaction, db, {
      ...input,
      reason: "MALFORMED_EXISTING_LINK",
      candidateLeadIds: [candidate.id],
    });

    return { status: "CONFLICT" };
  }

  if (existingLinkedUid === input.uid) {
    return { status: "ALREADY_LINKED" };
  }

  if (existingLinkedUid) {
    await createReviewNotification(transaction, db, {
      ...input,
      reason: "LEAD_ALREADY_LINKED_TO_DIFFERENT_UID",
      candidateLeadIds: [candidate.id],
    });

    return { status: "CONFLICT" };
  }

  transaction.set(
    candidate.ref,
    {
      linkedUid: input.uid,
      linkedAt: FieldValue.serverTimestamp(),
      linkMethod: VERIFIED_EMAIL_LINK_METHOD,
      identityLinkStatus: "LINKED",
    },
    { merge: true },
  );

  return { status: "LINKED" };
}

export async function linkLeadToVerifiedUser(
  input: LinkLeadToVerifiedUserInput,
): Promise<LeadUserLinkingResult> {
  const uid = cleanUid(input.uid);

  if (!uid) {
    throw new LeadUserLinkingError(
      "A verified Firebase UID is required.",
      "UID_REQUIRED",
    );
  }

  if (input.emailVerified !== true) {
    throw new LeadUserLinkingError(
      "Verified email is required for lead identity linking.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  const normalizedEmail = normalizeLeadEmail(input.email);

  if (!normalizedEmail) {
    throw new LeadUserLinkingError(
      "A verified email is required for lead identity linking.",
      "EMAIL_REQUIRED",
    );
  }

  const db = getAdminFirestore();

  return db.runTransaction((transaction) =>
    classifyAndLink(transaction, db, { uid, normalizedEmail }),
  );
}
