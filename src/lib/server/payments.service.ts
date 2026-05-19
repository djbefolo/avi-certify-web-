import { FieldValue } from "firebase-admin/firestore";
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

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
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
