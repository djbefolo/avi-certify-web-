import { FieldValue } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { paymentServiceConfigs, type PaymentServiceConfig } from "@/constants/payments";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";
import type {
  CreateCheckoutSessionInput,
  PaymentServiceType,
} from "@/types/payment";

const PAYMENTS_COLLECTION = "payments";

type CreatePaymentRecordParams = {
  paymentId: string;
  ownerId: string;
  serviceConfig: PaymentServiceConfig;
};

type UpdatePaymentSessionParams = {
  paymentId: string;
  stripeCheckoutSessionId: string;
  checkoutUrl: string;
};

type StripeWebhookContext = {
  eventId: string;
  eventType: string;
  eventCreated: number;
};

export type PaymentWebhookUpdateResult = {
  updated: boolean;
  paymentId?: string;
  reason?: string;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function getEventDate(context: StripeWebhookContext) {
  return new Date(context.eventCreated * 1000);
}

function getMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]?.trim();

  return value ? value : null;
}

function getExpandableId(value: string | { id?: string } | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.id ?? null;
}

async function findPaymentRefByPaymentIntentId(paymentIntentId: string) {
  const db = getAdminFirestore();
  const lookupFields = ["stripePaymentIntentId", "paymentIntentId"] as const;

  for (const field of lookupFields) {
    const snapshot = await db
      .collection(PAYMENTS_COLLECTION)
      .where(field, "==", paymentIntentId)
      .limit(1)
      .get();
    const [paymentDocument] = snapshot.docs;

    if (paymentDocument) {
      return paymentDocument.ref;
    }
  }

  return null;
}

async function getPaymentRefFromMetadataOrLookup({
  paymentId,
  paymentIntentId,
}: {
  paymentId: string | null;
  paymentIntentId: string | null;
}) {
  const db = getAdminFirestore();

  if (paymentId) {
    return db.collection(PAYMENTS_COLLECTION).doc(paymentId);
  }

  if (paymentIntentId) {
    return findPaymentRefByPaymentIntentId(paymentIntentId);
  }

  return null;
}

function getWebhookAuditFields(context: StripeWebhookContext) {
  return {
    lastStripeEventId: context.eventId,
    lastStripeEventType: context.eventType,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function getPaymentServiceConfig(
  serviceType: PaymentServiceType,
): PaymentServiceConfig {
  return paymentServiceConfigs[serviceType];
}

export async function createPaymentRecord({
  paymentId,
  ownerId,
  serviceConfig,
}: CreatePaymentRecordParams): Promise<void> {
  const db = getAdminFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);

  await paymentRef.set({
    ownerId,
    serviceType: serviceConfig.type,
    serviceLabel: serviceConfig.label,
    amount: serviceConfig.amount,
    currency: serviceConfig.currency,
    status: "pending",
    stripeCheckoutSessionId: null,
    stripePaymentIntentId: null,
    checkoutUrl: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function updatePaymentSession({
  paymentId,
  stripeCheckoutSessionId,
  checkoutUrl,
}: UpdatePaymentSessionParams): Promise<void> {
  const db = getAdminFirestore();

  await db.collection(PAYMENTS_COLLECTION).doc(paymentId).update({
    stripeCheckoutSessionId,
    stripeSessionId: stripeCheckoutSessionId,
    checkoutUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function createCheckoutSession(
  idToken: string,
  input: CreateCheckoutSessionInput,
): Promise<{ checkoutUrl: string }> {
  const decodedToken = await getAdminAuth().verifyIdToken(idToken);
  const ownerId = decodedToken.uid;
  const serviceConfig = getPaymentServiceConfig(input.serviceType);
  const db = getAdminFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc();
  const appUrl = getAppUrl();

  await createPaymentRecord({
    paymentId: paymentRef.id,
    ownerId,
    serviceConfig,
  });

  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: decodedToken.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: serviceConfig.currency,
          unit_amount: serviceConfig.amount,
          product_data: {
            name: serviceConfig.label,
            description: serviceConfig.description,
            metadata: serviceConfig.metadata,
          },
        },
      },
    ],
    metadata: {
      ownerId,
      paymentId: paymentRef.id,
      serviceType: serviceConfig.type,
      productFamily: serviceConfig.metadata.productFamily,
    },
    payment_intent_data: {
      metadata: {
        ownerId,
        paymentId: paymentRef.id,
        serviceType: serviceConfig.type,
      },
    },
    success_url: `${appUrl}/dossier/paiement?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dossier/paiement?payment=canceled`,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  await updatePaymentSession({
    paymentId: paymentRef.id,
    stripeCheckoutSessionId: session.id,
    checkoutUrl: session.url,
  });

  return {
    checkoutUrl: session.url,
  };
}

export async function markCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  context: StripeWebhookContext,
): Promise<PaymentWebhookUpdateResult> {
  const paymentId = getMetadataValue(session.metadata, "paymentId");

  if (!paymentId) {
    console.warn(
      "[stripe/webhook] checkout.session.completed missing metadata.paymentId",
      { sessionId: session.id, eventId: context.eventId },
    );
    return {
      updated: false,
      reason: "missing_payment_id",
    };
  }

  if (session.payment_status !== "paid") {
    console.info(
      "[stripe/webhook] checkout.session.completed ignored because payment is not paid",
      {
        paymentId,
        paymentStatus: session.payment_status,
        sessionId: session.id,
        eventId: context.eventId,
      },
    );
    return {
      updated: false,
      paymentId,
      reason: "payment_not_paid",
    };
  }

  const db = getAdminFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
  const existingPayment = await paymentRef.get();
  const metadataOwnerId = getMetadataValue(session.metadata, "ownerId");
  const existingOwnerId = existingPayment.exists
    ? String(existingPayment.get("ownerId") ?? "")
    : null;
  const ownerId = metadataOwnerId ?? existingOwnerId;

  if (!ownerId) {
    console.warn(
      "[stripe/webhook] checkout.session.completed missing ownerId",
      { paymentId, sessionId: session.id, eventId: context.eventId },
    );
    return {
      updated: false,
      paymentId,
      reason: "missing_owner_id",
    };
  }

  if (metadataOwnerId && existingOwnerId && metadataOwnerId !== existingOwnerId) {
    console.error(
      "[stripe/webhook] checkout.session.completed ownerId mismatch",
      {
        paymentId,
        metadataOwnerId,
        existingOwnerId,
        sessionId: session.id,
        eventId: context.eventId,
      },
    );
    return {
      updated: false,
      paymentId,
      reason: "owner_id_mismatch",
    };
  }

  const paymentIntentId = getExpandableId(session.payment_intent);
  const serviceType =
    getMetadataValue(session.metadata, "serviceType") ??
    (existingPayment.exists ? String(existingPayment.get("serviceType") ?? "") : null);
  const productFamily = getMetadataValue(session.metadata, "productFamily");

  await paymentRef.set(
    {
      status: "paid",
      ownerId,
      serviceType,
      productFamily,
      stripeCheckoutSessionId: session.id,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      paymentIntentId,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      customerEmail:
        session.customer_details?.email ?? session.customer_email ?? null,
      paidAt: getEventDate(context),
      ...getWebhookAuditFields(context),
    },
    { merge: true },
  );

  console.info("[stripe/webhook] Payment marked paid", {
    paymentId,
    ownerId,
    sessionId: session.id,
    paymentIntentId,
    eventId: context.eventId,
  });

  return {
    updated: true,
    paymentId,
  };
}

export async function markPaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  context: StripeWebhookContext,
): Promise<PaymentWebhookUpdateResult> {
  const paymentId = getMetadataValue(paymentIntent.metadata, "paymentId");
  const paymentRef = await getPaymentRefFromMetadataOrLookup({
    paymentId,
    paymentIntentId: paymentIntent.id,
  });

  if (!paymentRef) {
    console.warn("[stripe/webhook] payment_intent.payment_failed not matched", {
      paymentIntentId: paymentIntent.id,
      eventId: context.eventId,
    });
    return {
      updated: false,
      reason: "payment_not_found",
    };
  }

  const ownerId = getMetadataValue(paymentIntent.metadata, "ownerId");
  const serviceType = getMetadataValue(paymentIntent.metadata, "serviceType");

  await paymentRef.set(
    {
      status: "failed",
      ...(ownerId ? { ownerId } : {}),
      ...(serviceType ? { serviceType } : {}),
      stripePaymentIntentId: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code ?? null,
      failedAt: getEventDate(context),
      ...getWebhookAuditFields(context),
    },
    { merge: true },
  );

  console.info("[stripe/webhook] Payment marked failed", {
    paymentId: paymentRef.id,
    paymentIntentId: paymentIntent.id,
    eventId: context.eventId,
  });

  return {
    updated: true,
    paymentId: paymentRef.id,
  };
}

export async function markChargeRefunded(
  charge: Stripe.Charge,
  context: StripeWebhookContext,
): Promise<PaymentWebhookUpdateResult> {
  const paymentIntentId = getExpandableId(charge.payment_intent);
  const paymentId = getMetadataValue(charge.metadata, "paymentId");
  const paymentRef = await getPaymentRefFromMetadataOrLookup({
    paymentId,
    paymentIntentId,
  });

  if (!paymentRef) {
    console.warn("[stripe/webhook] charge.refunded not matched", {
      chargeId: charge.id,
      paymentIntentId,
      eventId: context.eventId,
    });
    return {
      updated: false,
      reason: "payment_not_found",
    };
  }

  await paymentRef.set(
    {
      status: "refunded",
      stripeChargeId: charge.id,
      ...(paymentIntentId
        ? {
            stripePaymentIntentId: paymentIntentId,
            paymentIntentId,
          }
        : {}),
      amountRefunded: charge.amount_refunded ?? charge.amount,
      refundedAt: getEventDate(context),
      ...getWebhookAuditFields(context),
    },
    { merge: true },
  );

  console.info("[stripe/webhook] Payment marked refunded", {
    paymentId: paymentRef.id,
    chargeId: charge.id,
    paymentIntentId,
    eventId: context.eventId,
  });

  return {
    updated: true,
    paymentId: paymentRef.id,
  };
}
