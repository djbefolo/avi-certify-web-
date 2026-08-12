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
import type { PaymentServiceType } from "@/types/payment";

const LEADS_COLLECTION = "leads";
const PAYMENTS_COLLECTION = "payments";
const CLIENTS_COLLECTION = "admin_client_profiles";
const EVENTS_COLLECTION = "admin_case_events";
const NOTIFICATIONS_COLLECTION = "admin_notifications";
const CANDIDATE_LIMIT = 3;

export type LeadClientConversionStatus =
  | "CONVERTED"
  | "ALREADY_CONVERTED"
  | "INVALID_TRIGGER"
  | "MISSING_LINKED_LEAD"
  | "AMBIGUOUS_IDENTITY"
  | "IDENTITY_CONFLICT";

export type ConvertLeadFromConfirmedPaymentInput = {
  paymentId: string;
  ownerId: string;
  serviceType: PaymentServiceType;
  caseId?: string | null;
};

export type LeadClientConversionResult = {
  status: LeadClientConversionStatus;
  leadId: string | null;
  clientId: string | null;
  clientCreated: boolean;
  caseId: string | null;
  notificationId: string | null;
};

type CandidateLead = {
  id: string;
  ref: DocumentReference<DocumentData>;
  data: Record<string, unknown>;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function conversionEventId(paymentId: string) {
  return `lead_conversion_${digest(`payment:${paymentId}`)}`;
}

function blockedNotificationId(paymentId: string) {
  return `lead_conversion_review_${digest(`payment:${paymentId}`)}`;
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

function identityStatus(lead: CandidateLead) {
  return text(lead.data.identityLinkStatus)?.toUpperCase() ?? "UNLINKED";
}

function result(
  status: LeadClientConversionStatus,
  input: Partial<LeadClientConversionResult> = {},
): LeadClientConversionResult {
  return {
    status,
    leadId: null,
    clientId: null,
    clientCreated: false,
    caseId: null,
    notificationId: null,
    ...input,
  };
}

async function findLinkedLeads(
  transaction: Transaction,
  db: Firestore,
  uid: string,
) {
  const snapshot = await transaction.get(
    db.collection(LEADS_COLLECTION).where("linkedUid", "==", uid).limit(CANDIDATE_LIMIT),
  );

  return snapshot.docs.map(candidateFromSnapshot);
}

async function persistBlockedConversion(
  transaction: Transaction,
  db: Firestore,
  input: ConvertLeadFromConfirmedPaymentInput,
  status: Extract<
    LeadClientConversionStatus,
    "MISSING_LINKED_LEAD" | "AMBIGUOUS_IDENTITY" | "IDENTITY_CONFLICT"
  >,
  candidateLeadIds: string[],
  existingNotification: { exists: boolean },
) {
  const notificationRef = db
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(blockedNotificationId(input.paymentId));
  const timestamp = new Date().toISOString();
  const payload = {
    id: notificationRef.id,
    type: "admin_action_required",
    severity: "warning",
    title: "Paiement confirmé — conversion client à vérifier",
    body: "Un paiement confirmé ne peut pas être rattaché de façon sûre à un prospect unique.",
    relatedUid: input.ownerId,
    relatedCaseId: input.caseId ?? null,
    updatedAt: timestamp,
    metadata: {
      category: "lead_client_conversion",
      conversionStatus: status,
      paymentId: input.paymentId,
      serviceType: input.serviceType,
      leadIds: candidateLeadIds,
    },
  };

  if (existingNotification.exists) {
    transaction.set(notificationRef, payload, { merge: true });
  } else {
    transaction.create(notificationRef, {
      ...payload,
      read: false,
      createdAt: timestamp,
    });
  }

  return notificationRef.id;
}

/**
 * Converts exactly one securely linked lead after the canonical Stripe
 * workflow has persisted a verified paid payment. It is deliberately not an
 * Admin action and it never creates a case: existing service workflows remain
 * the source of truth for case creation.
 */
export async function convertLeadFromConfirmedPayment(
  input: ConvertLeadFromConfirmedPaymentInput,
): Promise<LeadClientConversionResult> {
  const paymentId = text(input.paymentId);
  const ownerId = text(input.ownerId);

  if (!paymentId || !ownerId) {
    return result("INVALID_TRIGGER");
  }

  const db = getAdminFirestore();

  return db.runTransaction(async (transaction) => {
    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
    const eventRef = db.collection(EVENTS_COLLECTION).doc(conversionEventId(paymentId));
    const notificationRef = db
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(blockedNotificationId(paymentId));
    const [paymentSnapshot, eventSnapshot, notificationSnapshot, candidates] =
      await Promise.all([
        transaction.get(paymentRef),
        transaction.get(eventRef),
        transaction.get(notificationRef),
        findLinkedLeads(transaction, db, ownerId),
      ]);

    const paymentOwnerId = paymentSnapshot.exists
      ? text(paymentSnapshot.get("ownerId"))
      : null;
    const paymentStatus = paymentSnapshot.exists
      ? text(paymentSnapshot.get("status"))?.toLowerCase()
      : null;
    const paymentServiceType = paymentSnapshot.exists
      ? text(paymentSnapshot.get("serviceType"))
      : null;

    if (
      !paymentSnapshot.exists ||
      paymentStatus !== "paid" ||
      paymentOwnerId !== ownerId ||
      paymentServiceType !== input.serviceType
    ) {
      return result("INVALID_TRIGGER", { caseId: input.caseId ?? null });
    }

    if (eventSnapshot.exists) {
      return result("ALREADY_CONVERTED", {
        leadId: text(eventSnapshot.get("eventPayload")?.leadId),
        clientId: ownerId,
        caseId: input.caseId ?? null,
      });
    }

    if (candidates.length !== 1) {
      const notificationId = await persistBlockedConversion(
        transaction,
        db,
        { ...input, paymentId, ownerId },
        candidates.length ? "AMBIGUOUS_IDENTITY" : "MISSING_LINKED_LEAD",
        candidates.map((lead) => lead.id),
        notificationSnapshot,
      );
      return result(candidates.length ? "AMBIGUOUS_IDENTITY" : "MISSING_LINKED_LEAD", {
        caseId: input.caseId ?? null,
        notificationId,
      });
    }

    const lead = candidates[0];
    if (
      identityStatus(lead) !== "LINKED" ||
      text(lead.data.linkedUid) !== ownerId
    ) {
      const notificationId = await persistBlockedConversion(
        transaction,
        db,
        { ...input, paymentId, ownerId },
        "IDENTITY_CONFLICT",
        [lead.id],
        notificationSnapshot,
      );
      return result("IDENTITY_CONFLICT", {
        leadId: lead.id,
        caseId: input.caseId ?? null,
        notificationId,
      });
    }

    const clientRef = db.collection(CLIENTS_COLLECTION).doc(ownerId);
    const clientSnapshot = await transaction.get(clientRef);
    const timestamp = new Date().toISOString();
    const existingClient = (clientSnapshot.exists
      ? clientSnapshot.data()
      : {}) as Record<string, unknown>;
    const clientCreated = !clientSnapshot.exists;

    transaction.set(
      clientRef,
      {
        uid: ownerId,
        email: text(existingClient.email) ?? text(lead.data.email),
        fullName: text(existingClient.fullName) ?? text(lead.data.fullName),
        phone: text(existingClient.phone) ?? text(lead.data.phone),
        countryOfOrigin:
          text(existingClient.countryOfOrigin) ?? text(lead.data.residenceCountry),
        destinationCountry:
          text(existingClient.destinationCountry) ?? text(lead.data.destinationCountry),
        createdAt: existingClient.createdAt ?? timestamp,
        lastLoginAt: existingClient.lastLoginAt ?? null,
        accountStatus: existingClient.accountStatus ?? "UNKNOWN",
        onboardingStatus: existingClient.onboardingStatus ?? "NOT_STARTED",
        currentCaseId: existingClient.currentCaseId ?? input.caseId ?? null,
        tags: Array.isArray(existingClient.tags) ? existingClient.tags : [],
        priority: existingClient.priority ?? "NORMAL",
        assignedAdminId: existingClient.assignedAdminId ?? null,
        source: existingClient.source ?? "client_conversion",
        clientStatus: "CLIENT",
        convertedAt: existingClient.convertedAt ?? FieldValue.serverTimestamp(),
        convertedBy: "stripe_webhook",
        conversionReason: "PAYMENT_CONFIRMED",
        conversionSource: "STRIPE_WEBHOOK",
        conversionReference: paymentId,
        originLeadId: existingClient.originLeadId ?? lead.id,
        updatedAt: timestamp,
      },
      { merge: true },
    );

    transaction.set(
      lead.ref,
      {
        crmStatus: "CONVERTED",
        convertedAt: lead.data.convertedAt ?? FieldValue.serverTimestamp(),
        clientId: ownerId,
        conversionReason: "PAYMENT_CONFIRMED",
        conversionSource: "STRIPE_WEBHOOK",
        conversionReference: paymentId,
        updatedAt: timestamp,
      },
      { merge: true },
    );
    transaction.create(eventRef, {
      id: eventRef.id,
      caseId: input.caseId ?? null,
      uid: ownerId,
      actorType: "system",
      actorId: "stripe_webhook",
      actorRole: "system",
      eventType: "lead_converted_to_client",
      eventLabel: "Prospect converti en client",
      eventPayload: {
        leadId: lead.id,
        clientId: ownerId,
        conversionReason: "PAYMENT_CONFIRMED",
        conversionSource: "STRIPE_WEBHOOK",
        conversionReference: paymentId,
        serviceType: input.serviceType,
        caseId: input.caseId ?? null,
      },
      createdAt: timestamp,
    });

    return result("CONVERTED", {
      leadId: lead.id,
      clientId: ownerId,
      clientCreated,
      caseId: input.caseId ?? null,
    });
  });
}
