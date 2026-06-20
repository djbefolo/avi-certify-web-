import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const doc = vi.fn(() => ({ id: "lead-1", set }));
  const collection = vi.fn(() => ({ doc }));

  return {
    collection,
    doc,
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
  captureLead,
  LeadCaptureError,
  validateLeadCaptureInput,
} from "@/lib/server/lead-capture.service";

const guideLead = {
  fullName: "  Awa   Ndiaye ",
  email: "AWA@EXAMPLE.COM ",
  phone: " +237 699 000 000 ",
  country: " Cameroun ",
  destinationCountry: " France ",
  serviceInterest: " Guide France 2026 ",
  projectHorizon: "",
  source: "guide",
  origin: " guide_modal ",
  marketingConsent: true,
};

beforeEach(() => {
  firestoreMocks.collection.mockClear();
  firestoreMocks.doc.mockClear();
  firestoreMocks.getAdminFirestore.mockClear();
  firestoreMocks.serverTimestamp.mockClear();
  firestoreMocks.set.mockReset();
});

describe("lead capture service", () => {
  it("creates a valid guide lead with explicit marketing consent", async () => {
    const result = await captureLead(guideLead);

    expect(result).toEqual({ id: "lead-1", status: "NEW" });
    expect(firestoreMocks.collection).toHaveBeenCalledWith("leads");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "lead-1",
        fullName: "Awa Ndiaye",
        email: "awa@example.com",
        phone: "+237 699 000 000",
        country: "Cameroun",
        destinationCountry: "France",
        serviceInterest: "Guide France 2026",
        projectHorizon: null,
        source: "guide",
        origin: "guide_modal",
        status: "NEW",
        guideRequested: true,
        guideDelivered: false,
        marketingConsent: true,
        marketingConsentAt: "server-timestamp",
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        referrer: null,
      }),
      { merge: false },
    );
  });

  it("rejects a guide request without explicit marketing consent", async () => {
    await expect(
      captureLead({ ...guideLead, marketingConsent: false }),
    ).rejects.toBeInstanceOf(LeadCaptureError);

    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("stores a non-guide lead without marketing consent as non marketable", async () => {
    await captureLead({
      fullName: "Awa Ndiaye",
      email: "awa@example.com",
      source: "contact",
      marketingConsent: false,
    });

    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "contact",
        guideRequested: false,
        marketingConsent: false,
        marketingConsentAt: null,
      }),
      { merge: false },
    );
  });

  it("trims provided UTM and referrer values without inventing missing ones", async () => {
    await captureLead({
      ...guideLead,
      utmSource: " newsletter ",
      utmMedium: " email ",
      utmCampaign: " guide_launch ",
      referrer: " https://example.com/path ",
    });

    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        utmSource: "newsletter",
        utmMedium: "email",
        utmCampaign: "guide_launch",
        referrer: "https://example.com/path",
      }),
      { merge: false },
    );
  });

  it("rejects invalid email, invalid source, and empty full name", () => {
    expect(() =>
      validateLeadCaptureInput({ ...guideLead, email: "not-an-email" }),
    ).toThrow(LeadCaptureError);
    expect(() =>
      validateLeadCaptureInput({ ...guideLead, source: "admin" }),
    ).toThrow(LeadCaptureError);
    expect(() =>
      validateLeadCaptureInput({ ...guideLead, fullName: " " }),
    ).toThrow(LeadCaptureError);
  });
});
