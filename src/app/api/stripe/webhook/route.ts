import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  markChargeRefunded,
  markCheckoutSessionCompleted,
  markPaymentIntentFailed,
} from "@/lib/server/payments.service";
import {
  getStripeServerClient,
  getStripeWebhookSecret,
} from "@/lib/stripe/server";
import {
  claimStripeEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
} from "@/lib/server/stripe-event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookResponse = {
  received: true;
  handled: boolean;
  eventType?: string;
  paymentId?: string;
  message?: string;
  reason?: string;
};

function jsonResponse(body: WebhookResponse | { error: string }, init: ResponseInit) {
  const headers = new Headers(init.headers);

  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function getSignature(request: NextRequest) {
  return request.headers.get("stripe-signature");
}

function verifyStripeEvent(request: NextRequest, rawBody: string): Stripe.Event {
  const signature = getSignature(request);

  if (!signature) {
    throw new Error("Missing stripe-signature header.");
  }

  return getStripeServerClient().webhooks.constructEvent(
    rawBody,
    signature,
    getStripeWebhookSecret(),
  );
}

function isMissingWebhookSecretError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("STRIPE_WEBHOOK_SECRET")
  );
}

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    const rawBody = await request.text();

    event = verifyStripeEvent(request, rawBody);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) {
      console.warn("[stripe/webhook] Invalid signature", {
        message: error.message,
      });
      return jsonResponse({ error: "Invalid Stripe signature." }, { status: 400 });
    }

    if (isMissingWebhookSecretError(error)) {
      console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured.");
      return jsonResponse(
        { error: "Stripe webhook is not configured." },
        { status: 500 },
      );
    }

    console.error("[stripe/webhook] Unable to verify event", error);
    return jsonResponse(
      { error: "Stripe webhook verification failed." },
      { status: 400 },
    );
  }

  console.info("[stripe/webhook] Event received", {
    eventId: event.id,
    eventType: event.type,
  });

  const context = {
    eventId: event.id,
    eventType: event.type,
    eventCreated: event.created,
  };

  try {
    const claim = await claimStripeEvent(context);
    if (!claim.claimed) {
      return jsonResponse(
        {
          received: true,
          handled: false,
          eventType: event.type,
          reason: "duplicate_event",
          message: `Stripe event already ${claim.duplicateStatus}.`,
        },
        { status: 200 },
      );
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await markCheckoutSessionCompleted(session, context);
        await markStripeEventProcessed(event.id);

        return jsonResponse(
          {
            received: true,
            handled: true,
            eventType: event.type,
            paymentId: result.paymentId,
            reason: result.reason,
            message: result.updated
              ? "Checkout session processed."
              : "Checkout session acknowledged without update.",
          },
          { status: 200 },
        );
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const result = await markPaymentIntentFailed(paymentIntent, context);
        await markStripeEventProcessed(event.id);

        return jsonResponse(
          {
            received: true,
            handled: true,
            eventType: event.type,
            paymentId: result.paymentId,
            reason: result.reason,
            message: result.updated
              ? "Payment intent failure processed."
              : "Payment intent failure acknowledged without update.",
          },
          { status: 200 },
        );
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const result = await markChargeRefunded(charge, context);
        await markStripeEventProcessed(event.id);

        return jsonResponse(
          {
            received: true,
            handled: true,
            eventType: event.type,
            paymentId: result.paymentId,
            reason: result.reason,
            message: result.updated
              ? "Charge refund processed."
              : "Charge refund acknowledged without update.",
          },
          { status: 200 },
        );
      }

      default:
        console.info("[stripe/webhook] Event type ignored", {
          eventId: event.id,
          eventType: event.type,
        });

        await markStripeEventProcessed(event.id);
        return jsonResponse(
          {
            received: true,
            handled: false,
            eventType: event.type,
            message: "Unhandled Stripe event acknowledged.",
          },
          { status: 200 },
        );
    }
  } catch (error) {
    console.error("[stripe/webhook] Event processing failed", {
      eventId: event.id,
      eventType: event.type,
      error,
    });

    await markStripeEventFailed(
      event.id,
      error instanceof Error ? error.message : "STRIPE_EVENT_PROCESSING_FAILED",
    ).catch((auditError) => {
      console.error("[stripe/webhook] Unable to persist failed event status", {
        eventId: event.id,
        auditError,
      });
    });

    return jsonResponse(
      { error: "Stripe webhook processing failed." },
      { status: 500 },
    );
  }
}
