import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  claim: vi.fn(),
  processed: vi.fn(),
  failed: vi.fn(),
  checkoutCompleted: vi.fn(),
  paymentFailed: vi.fn(),
  chargeRefunded: vi.fn(),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
  }),
  getStripeWebhookSecret: () => "whsec_test",
}));

vi.mock("@/lib/server/stripe-event.service", () => ({
  claimStripeEvent: mocks.claim,
  markStripeEventProcessed: mocks.processed,
  markStripeEventFailed: mocks.failed,
}));

vi.mock("@/lib/server/payments.service", () => ({
  markCheckoutSessionCompleted: mocks.checkoutCompleted,
  markPaymentIntentFailed: mocks.paymentFailed,
  markChargeRefunded: mocks.chargeRefunded,
}));

import { POST } from "@/app/api/stripe/webhook/route";

function request(signature = "stripe-signature") {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: "raw-stripe-body",
  });
}

describe("Stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claim.mockResolvedValue({ claimed: true });
    mocks.processed.mockResolvedValue(undefined);
    mocks.failed.mockResolvedValue(undefined);
    mocks.checkoutCompleted.mockResolvedValue({
      updated: true,
      paymentId: "payment-1",
    });
    mocks.constructEvent.mockReturnValue({
      id: "evt-1",
      type: "checkout.session.completed",
      created: 1_775_000_000,
      data: { object: { id: "cs_test_1" } },
    });
  });

  it("processes a verified event and finalizes its idempotency record", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.checkoutCompleted).toHaveBeenCalledTimes(1);
    expect(mocks.processed).toHaveBeenCalledWith("evt-1");
  });

  it("keeps an amount mismatch retryable instead of finalizing the event", async () => {
    mocks.checkoutCompleted.mockResolvedValue({
      updated: false,
      paymentId: "payment-1",
      reason: "payment_amount_mismatch",
    });

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: "payment_amount_mismatch", paymentId: "payment-1" }),
    );
    expect(mocks.processed).not.toHaveBeenCalled();
    expect(mocks.failed).toHaveBeenCalledWith("evt-1", "payment_amount_mismatch");
  });

  it("keeps an unexpected post-payment conversion failure retryable", async () => {
    mocks.checkoutCompleted.mockRejectedValueOnce(
      new Error("conversion transient failure"),
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.processed).not.toHaveBeenCalled();
    expect(mocks.failed).toHaveBeenCalledWith(
      "evt-1",
      "conversion transient failure",
    );
  });

  it("acknowledges a duplicate without running payment fulfillment", async () => {
    mocks.claim.mockResolvedValue({
      claimed: false,
      duplicateStatus: "processed",
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ reason: "duplicate_event", handled: false }),
    );
    expect(mocks.checkoutCompleted).not.toHaveBeenCalled();
  });

  it("rejects an event that cannot be signature-verified", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("signature mismatch");
    });
    const response = await POST(request("invalid"));
    expect(response.status).toBe(400);
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});
