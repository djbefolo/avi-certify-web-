import Stripe from "stripe";

const stripeApiVersion = "2025-02-24.acacia";

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Stripe env var: ${name}`);
  }

  return value;
}

export function getStripeServerClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
    apiVersion: stripeApiVersion,
    typescript: true,
  });

  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}
