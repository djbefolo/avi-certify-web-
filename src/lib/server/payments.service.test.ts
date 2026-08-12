import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  paymentSet: vi.fn(),
  paymentUpdate: vi.fn(),
  paymentGet: vi.fn(),
  stripeCreate: vi.fn(),
  requireHousingRequest: vi.fn(),
  attachPayment: vi.fn(),
  evaluateCertificate: vi.fn(),
  convertLead: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken: mocks.verifyIdToken,
    getUser: vi.fn(),
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        id: "payment-1",
        get: mocks.paymentGet,
        set: mocks.paymentSet,
        update: mocks.paymentUpdate,
      }),
    }),
  }),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: () => ({
    checkout: { sessions: { create: mocks.stripeCreate } },
  }),
}));

vi.mock("@/lib/housing/housing-request.service", () => ({
  requireHousingRequestForCheckout: mocks.requireHousingRequest,
  attachPaymentToHousingRequest: mocks.attachPayment,
  evaluateHousingCertificateAfterPayment: mocks.evaluateCertificate,
}));

vi.mock("@/lib/server/lead-client-conversion.service", () => ({
  convertLeadFromConfirmedPayment: mocks.convertLead,
}));

import {
  createCheckoutSession,
  markCheckoutSessionCompleted,
} from "@/lib/server/payments.service";

describe("housing checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyIdToken.mockResolvedValue({
      uid: "client-1",
      email: "student@example.com",
      email_verified: true,
    });
    mocks.requireHousingRequest.mockResolvedValue({
      id: "housing-request-1",
      ownerId: "client-1",
      caseId: "case-1",
      preferredCityCode: "lyon",
    });
    mocks.stripeCreate.mockResolvedValue({
      id: "cs_test_1",
      url: "https://checkout.stripe.test/session",
    });
    mocks.paymentSet.mockResolvedValue(undefined);
    mocks.paymentUpdate.mockResolvedValue(undefined);
    mocks.attachPayment.mockResolvedValue(undefined);
    mocks.paymentGet.mockResolvedValue({
      exists: true,
      get: (field: string) =>
        ({
          ownerId: "client-1",
          serviceType: "accommodation_certificate",
          housingRequestId: "housing-request-1",
        })[field],
    });
    mocks.evaluateCertificate.mockResolvedValue({
      job: null,
      automaticGenerationQueued: false,
    });
    mocks.convertLead.mockResolvedValue({ status: "CONVERTED" });
  });

  it("queues one housing document job after a validated paid webhook", async () => {
    const session = {
      id: "cs_test_1",
      metadata: {
        paymentId: "payment-1",
        ownerId: "client-1",
        serviceType: "accommodation_certificate",
        housingRequestId: "housing-request-1",
      },
      payment_status: "paid",
      payment_intent: "pi_test_1",
      amount_total: 9900,
      currency: "eur",
      customer_details: { email: "student@example.com" },
    } as unknown as Stripe.Checkout.Session;

    const result = await markCheckoutSessionCompleted(session, {
      eventId: "evt-1",
      eventType: "checkout.session.completed",
      eventCreated: 1_775_000_000,
    });

    expect(result).toEqual({ updated: true, paymentId: "payment-1" });
    expect(mocks.evaluateCertificate).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "housing-request-1",
        paymentId: "payment-1",
        stripeEventId: "evt-1",
      }),
    );
    expect(mocks.convertLead).toHaveBeenCalledWith({
      paymentId: "payment-1",
      ownerId: "client-1",
      serviceType: "accommodation_certificate",
      caseId: null,
    });
  });

  it("does not confirm or queue a manipulated amount", async () => {
    const session = {
      id: "cs_test_bad",
      metadata: {
        paymentId: "payment-1",
        ownerId: "client-1",
        serviceType: "accommodation_certificate",
        housingRequestId: "housing-request-1",
      },
      payment_status: "paid",
      payment_intent: "pi_test_bad",
      amount_total: 1,
      currency: "eur",
    } as unknown as Stripe.Checkout.Session;

    await expect(
      markCheckoutSessionCompleted(session, {
        eventId: "evt-bad",
        eventType: "checkout.session.completed",
        eventCreated: 1_775_000_000,
      }),
    ).resolves.toEqual({
      updated: false,
      paymentId: "payment-1",
      reason: "payment_amount_mismatch",
    });
    expect(mocks.paymentSet).not.toHaveBeenCalled();
    expect(mocks.evaluateCertificate).not.toHaveBeenCalled();
  });

  it("uses the server price and safe request metadata", async () => {
    await expect(
      createCheckoutSession("id-token", {
        serviceType: "accommodation_certificate",
        housingRequestId: "housing-request-1",
      }),
    ).resolves.toEqual({ checkoutUrl: "https://checkout.stripe.test/session" });

    expect(mocks.requireHousingRequest).toHaveBeenCalledWith(
      "housing-request-1",
      "client-1",
    );
    expect(mocks.attachPayment).toHaveBeenCalledWith({
      requestId: "housing-request-1",
      paymentId: "payment-1",
      amount: 9900,
      currency: "eur",
    });
    expect(mocks.stripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 9900,
              currency: "eur",
            }),
          }),
        ],
        metadata: expect.objectContaining({
          ownerId: "client-1",
          housingRequestId: "housing-request-1",
          caseId: "case-1",
          cityCode: "lyon",
          workflowType: "conditional_housing_certificate",
        }),
      }),
    );
  });

  it("rejects a missing or foreign housing request before Stripe", async () => {
    mocks.requireHousingRequest.mockRejectedValueOnce(
      new Error("HOUSING_REQUEST_NOT_FOUND"),
    );

    await expect(
      createCheckoutSession("id-token", {
        serviceType: "accommodation_certificate",
        housingRequestId: "housing-missing",
      }),
    ).rejects.toThrow("HOUSING_REQUEST_NOT_FOUND");
    expect(mocks.stripeCreate).not.toHaveBeenCalled();
  });
});
