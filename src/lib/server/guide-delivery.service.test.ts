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

const emailMocks = vi.hoisted(() => ({
  sendGuideAvailableEmail: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: firestoreMocks.serverTimestamp,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendGuideAvailableEmail: emailMocks.sendGuideAvailableEmail,
}));

import {
  GuideDeliveryError,
  prepareGuideDeliveryForLead,
  sendGuideDeliveryEmailForLead,
} from "@/lib/server/guide-delivery.service";

beforeEach(() => {
  firestoreMocks.collection.mockClear();
  firestoreMocks.doc.mockClear();
  firestoreMocks.get.mockReset();
  firestoreMocks.getAdminFirestore.mockClear();
  firestoreMocks.serverTimestamp.mockClear();
  firestoreMocks.set.mockReset();
  emailMocks.sendGuideAvailableEmail.mockReset();
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

  it("sends the guide email and stores email delivery metadata", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "guide",
        guideRequested: true,
        guideDelivered: false,
        guideDeliveryStatus: "READY",
        marketingConsent: true,
        email: "awa@example.com",
        fullName: "Awa Ndiaye",
      }),
    });
    emailMocks.sendGuideAvailableEmail.mockResolvedValueOnce({
      sent: true,
      messageId: "resend-guide-1",
      status: "SENT",
      provider: "resend",
    });

    const result = await sendGuideDeliveryEmailForLead("lead-1");

    expect(result).toEqual({
      leadId: "lead-1",
      guideEmailSent: true,
      guideEmailStatus: "SENT",
      guideEmailMessageId: "resend-guide-1",
      guideDelivered: false,
    });
    expect(emailMocks.sendGuideAvailableEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "awa@example.com",
        leadFullName: "Awa Ndiaye",
        dashboardUrl:
          "https://www.avicertify.fr/dashboard?resource=guide-france-2026",
      }),
    );
    const emailInput = emailMocks.sendGuideAvailableEmail.mock.calls[0][0] as {
      dashboardUrl: string;
    };
    expect(emailInput.dashboardUrl).not.toContain(".pdf");
    expect(emailInput.dashboardUrl).not.toContain("/api/client/resources");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        guideLastDeliveryAttemptAt: "server-timestamp",
        guideEmailStatus: "SENT",
        guideEmailMessageId: "resend-guide-1",
        guideEmailProvider: "resend",
        guideEmailSentAt: "server-timestamp",
        guideDelivered: false,
        updatedAt: "server-timestamp",
      }),
      { merge: true },
    );
  });

  it("does not email a guide lead without marketing consent", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "guide",
        guideRequested: true,
        guideDeliveryStatus: "READY",
        marketingConsent: false,
        email: "awa@example.com",
      }),
    });

    await expect(sendGuideDeliveryEmailForLead("lead-1")).rejects.toMatchObject({
      code: "GUIDE_MARKETING_CONSENT_REQUIRED",
    } satisfies Partial<GuideDeliveryError>);
    expect(emailMocks.sendGuideAvailableEmail).not.toHaveBeenCalled();
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("does not email a non-guide lead", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "contact",
        guideRequested: false,
        guideDeliveryStatus: "READY",
        marketingConsent: true,
        email: "awa@example.com",
      }),
    });

    await expect(sendGuideDeliveryEmailForLead("lead-1")).rejects.toMatchObject({
      code: "LEAD_NOT_GUIDE_REQUEST",
    } satisfies Partial<GuideDeliveryError>);
    expect(emailMocks.sendGuideAvailableEmail).not.toHaveBeenCalled();
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("stores a controlled failed email attempt without claiming delivery", async () => {
    firestoreMocks.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        source: "guide",
        guideRequested: true,
        guideDeliveryStatus: "READY",
        marketingConsent: true,
        email: "awa@example.com",
        fullName: "Awa Ndiaye",
      }),
    });
    emailMocks.sendGuideAvailableEmail.mockResolvedValueOnce({
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    });

    const result = await sendGuideDeliveryEmailForLead("lead-1");

    expect(result).toEqual({
      leadId: "lead-1",
      guideEmailSent: false,
      guideEmailStatus: "SEND_FAILED",
      guideEmailMessageId: null,
      guideDelivered: false,
    });
    const payload = firestoreMocks.set.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload).toMatchObject({
      guideLastDeliveryAttemptAt: "server-timestamp",
      guideEmailStatus: "SEND_FAILED",
      guideEmailMessageId: null,
      guideEmailProvider: "resend",
      guideDelivered: false,
      updatedAt: "server-timestamp",
    });
    expect(payload).not.toHaveProperty("guideEmailSentAt");
  });
});
