import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

const STRIPE_EVENTS_COLLECTION = "stripe_events";
const PROCESSING_LEASE_MS = 5 * 60 * 1000;

export type StripeEventClaim = {
  claimed: boolean;
  duplicateStatus?: "processing" | "processed";
};

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export async function claimStripeEvent({
  eventId,
  eventType,
  eventCreated,
}: {
  eventId: string;
  eventType: string;
  eventCreated: number;
}): Promise<StripeEventClaim> {
  const db = getAdminFirestore();
  const eventRef = db.collection(STRIPE_EVENTS_COLLECTION).doc(eventId);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    const currentStatus = snapshot.exists ? snapshot.get("status") : null;

    const processingStartedAt = toDate(snapshot.get("processingStartedAt"));
    const hasActiveLease =
      currentStatus === "processing" &&
      processingStartedAt &&
      Date.now() - processingStartedAt.getTime() < PROCESSING_LEASE_MS;

    if (currentStatus === "processed" || hasActiveLease) {
      return {
        claimed: false,
        duplicateStatus:
          currentStatus === "processed" ? "processed" : "processing",
      };
    }

    transaction.set(
      eventRef,
      {
        id: eventId,
        eventType,
        eventCreated,
        status: "processing",
        attemptCount: FieldValue.increment(1),
        processingStartedAt: FieldValue.serverTimestamp(),
        createdAt: snapshot.exists
          ? snapshot.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastErrorCode: null,
      },
      { merge: true },
    );

    return { claimed: true };
  });
}

export async function markStripeEventProcessed(eventId: string) {
  await getAdminFirestore().collection(STRIPE_EVENTS_COLLECTION).doc(eventId).set(
    {
      status: "processed",
      processedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastErrorCode: null,
    },
    { merge: true },
  );
}

export async function markStripeEventFailed(eventId: string, code: string) {
  await getAdminFirestore().collection(STRIPE_EVENTS_COLLECTION).doc(eventId).set(
    {
      status: "failed",
      failedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastErrorCode: code.slice(0, 120),
    },
    { merge: true },
  );
}
