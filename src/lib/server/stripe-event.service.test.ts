import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => {
  const records = new Map<string, Record<string, unknown>>();
  const reference = (id: string) => ({ id });
  const snapshot = (id: string) => {
    const data = records.get(id);
    return {
      exists: Boolean(data),
      get: (field: string) => data?.[field],
    };
  };
  const set = (id: string, value: Record<string, unknown>) => {
    records.set(id, {
      ...(records.get(id) ?? {}),
      ...value,
      ...(value.processingStartedAt ? { processingStartedAt: new Date() } : {}),
    });
  };
  return {
    records,
    db: {
      collection: () => ({
        doc: (id: string) => ({
          ...reference(id),
          set: vi.fn(async (value: Record<string, unknown>) => set(id, value)),
        }),
      }),
      runTransaction: vi.fn(
        async (
          handler: (transaction: {
            get: (ref: { id: string }) => Promise<ReturnType<typeof snapshot>>;
            set: (ref: { id: string }, value: Record<string, unknown>) => void;
          }) => Promise<unknown>,
        ) =>
          handler({
            get: async (ref) => snapshot(ref.id),
            set: (ref, value) => set(ref.id, value),
          }),
      ),
    },
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => firestore.db,
}));

import {
  claimStripeEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
} from "@/lib/server/stripe-event.service";

describe("Stripe event idempotency", () => {
  beforeEach(() => {
    firestore.records.clear();
  });

  it("claims an event once and ignores the active duplicate", async () => {
    const input = {
      eventId: "evt_housing_1",
      eventType: "checkout.session.completed",
      eventCreated: 1_700_000_000,
    };

    await expect(claimStripeEvent(input)).resolves.toEqual({ claimed: true });
    await expect(claimStripeEvent(input)).resolves.toEqual({
      claimed: false,
      duplicateStatus: "processing",
    });
  });

  it("keeps a processed event idempotent", async () => {
    const input = {
      eventId: "evt_housing_2",
      eventType: "checkout.session.completed",
      eventCreated: 1_700_000_000,
    };
    await claimStripeEvent(input);
    await markStripeEventProcessed(input.eventId);

    await expect(claimStripeEvent(input)).resolves.toEqual({
      claimed: false,
      duplicateStatus: "processed",
    });
  });

  it("keeps a failed business event retryable", async () => {
    const input = {
      eventId: "evt_housing_retry",
      eventType: "checkout.session.completed",
      eventCreated: 1_700_000_000,
    };
    await claimStripeEvent(input);
    await markStripeEventFailed(input.eventId, "payment_amount_mismatch");

    expect(firestore.records.get(input.eventId)).toMatchObject({
      status: "failed_retryable",
      retryable: true,
      lastErrorCode: "payment_amount_mismatch",
    });
    await expect(claimStripeEvent(input)).resolves.toEqual({ claimed: true });
  });
});
