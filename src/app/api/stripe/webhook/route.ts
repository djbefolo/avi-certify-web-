import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Stripe webhook is not configured yet.",
      nextEvents: [
        "checkout.session.completed",
        "payment_intent.payment_failed",
        "charge.refunded",
      ],
    },
    {
      status: 501,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
