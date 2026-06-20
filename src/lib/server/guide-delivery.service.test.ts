import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const get = vi.fn();
  const set = vi.fn();
  const doc = vi.fn(() => ({ get, set }));
  const collection = vi.fn(() => ({ doc }));

  return {
    collection,
    doc,
    get,
    getAdminFirestore: vi.fn(() => ({ collection })),
    serverTimestamp: vi.fn(() => "server-timestamp"),
    set,
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: firestoreMocks.serverTimestamp,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

import {
  GuideDeliveryError,
  prepareGuideDeliveryForLead,
} from "@/lib/server/guide-delivery.service";

beforeEach(() => {
  firestoreMocks.collection.mockClear();
  firestoreMocks.doc.mockClear();
  firestoreMocks.get.mockReset();
  firestoreMocks.getAdminFirestore.mockClear();
  firestoreMocks.serverTimestamp.mockClear();
  firestoreMocks.set.mockReset();
});

describe("guide delivery service", () => {
  it("prepares secure guide delivery for an existing guide lead", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "guide",
        guideRequested: true,
        guideDelivered: false,
      }),
    });

    const result = await prepareGuideDeliveryForLead(" lead-1 ");

    expect(result).toEqual({
      leadId: "lead-1",
      guideResourceId: "guide-france-2026",
      guideDeliveryStatus: "READY",
      guideDeliveryChannel: "client_space",
      guideDelivered: false,
    });
    expect(firestoreMocks.collection).toHaveBeenCalledWith("leads");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(firestoreMocks.doc).toHaveBeenCalledWith("lead-1");
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        guideResourceId: "guide-france-2026",
        guideDeliveryStatus: "READY",
        guideDeliveryChannel: "client_space",
        guideDeliveryPreparedAt: "server-timestamp",
        guideDelivered: false,
        updatedAt: "server-timestamp",
      }),
      { merge: true },
    );

    const payload = firestoreMocks.set.mock.calls[0][0] as Record<
      string,
      unknown
    >;

    expect(payload).not.toHaveProperty("publicUrl");
    expect(payload).not.toHaveProperty("downloadUrl");
    expect(payload).not.toHaveProperty("token");
    expect(payload).not.toHaveProperty("storagePath");
  });

  it("rejects a missing lead without writing delivery metadata", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: false,
      data: () => null,
    });

    await expect(prepareGuideDeliveryForLead("missing-lead")).rejects.toMatchObject({
      code: "LEAD_NOT_FOUND",
    } satisfies Partial<GuideDeliveryError>);
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("rejects a non-guide lead without preparing guide delivery", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "contact",
        guideRequested: false,
      }),
    });

    await expect(prepareGuideDeliveryForLead("lead-2")).rejects.toMatchObject({
      code: "LEAD_NOT_GUIDE_REQUEST",
    } satisfies Partial<GuideDeliveryError>);
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });
});
