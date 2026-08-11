import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const docGet = vi.fn();
  const doc = vi.fn(() => ({ get: docGet, set }));
  const listGet = vi.fn();
  const limit = vi.fn(() => ({ get: listGet }));
  const orderBy = vi.fn(() => ({ limit }));
  const collection = vi.fn(() => ({ doc, orderBy }));

  return {
    collection,
    doc,
    docGet,
    getAdminFirestore: vi.fn(() => ({ collection })),
    limit,
    listGet,
    orderBy,
    set,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

import {
  AdminLeadValidationError,
  AdminLeadsStore,
} from "@/lib/admin/admin-leads-store";

const leadData = {
  id: "lead-1",
  fullName: "Awa Ndiaye",
  email: "awa@example.com",
  phone: "+237600000000",
  source: "guide",
  marketingConsent: true,
  guideRequested: true,
  guideDeliveryStatus: "READY",
  guideEmailStatus: "SENT",
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
};

describe("AdminLeadsStore", () => {
  beforeEach(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "firebase@test.local");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "private-key");
    firestoreMocks.collection.mockClear();
    firestoreMocks.doc.mockClear();
    firestoreMocks.docGet.mockReset();
    firestoreMocks.getAdminFirestore.mockClear();
    firestoreMocks.limit.mockClear();
    firestoreMocks.listGet.mockReset();
    firestoreMocks.orderBy.mockClear();
    firestoreMocks.set.mockReset();
  });

  it("lists recent leads and defaults missing crmStatus to new", async () => {
    firestoreMocks.listGet.mockResolvedValueOnce({
      docs: [
        {
          id: "lead-1",
          data: () => leadData,
        },
      ],
    });

    const store = new AdminLeadsStore();
    const result = await store.listLeads();

    expect(firestoreMocks.collection).toHaveBeenCalledWith("leads");
    expect(firestoreMocks.orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(result.leads[0]).toMatchObject({
      id: "lead-1",
      email: "awa@example.com",
      normalizedEmail: "awa@example.com",
      source: "GUIDE_DOWNLOAD",
      canonicalCrmStatus: "NEW",
      crmStatus: "new",
      crmPriority: "normal",
    });
    expect(result.stats).toMatchObject({
      total: 1,
      new: 1,
      guideSucceeded: 1,
    });
  });

  it("serves canonical public and guide leads through the Admin CRM read path", async () => {
    firestoreMocks.listGet.mockResolvedValueOnce({
      docs: [
        {
          id: "36eHSNLiJUM6ct1oxiki",
          data: () => ({
            fullName: "NTALOULOU Arlodie Serge",
            email: "toufinamaoumbam@gmail.com",
            phone: "+242050542011",
            residenceCountry: "congo",
            destinationCountry: "france",
            requestedService: "hebergement",
            consentAccepted: true,
            source: "landing_page",
            status: "new",
            createdAt: "2026-06-27T10:00:00.000Z",
          }),
        },
        {
          id: "guide-legacy",
          data: () => ({
            fullName: "Awa Ndiaye",
            email: "awa@example.com",
            country: "cameroun",
            serviceInterest: "guide_france_2026",
            marketingConsent: true,
            source: "guide",
            status: "NEW",
            createdAt: "2026-06-26T10:00:00.000Z",
          }),
        },
      ],
    });

    const result = await new AdminLeadsStore().listLeads();

    expect(result.leads[0]).toMatchObject({
      id: "36eHSNLiJUM6ct1oxiki",
      residenceCountry: "congo",
      country: "congo",
      requestedService: "hebergement",
      serviceInterest: "hebergement",
      source: "PUBLIC_CONTACT_FORM",
      canonicalCrmStatus: "NEW",
      crmStatus: "new",
      contactConsent: true,
      marketingConsent: false,
    });
    expect(result.leads[1]).toMatchObject({
      id: "guide-legacy",
      residenceCountry: "cameroun",
      country: "cameroun",
      requestedService: "guide_france_2026",
      serviceInterest: "guide_france_2026",
      source: "GUIDE_DOWNLOAD",
      canonicalCrmStatus: "NEW",
      crmStatus: "new",
      contactConsent: false,
      marketingConsent: true,
    });
  });

  it("rejects invalid crmStatus updates", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      exists: true,
      id: "lead-1",
      data: () => leadData,
    });

    const store = new AdminLeadsStore();

    await expect(
      store.updateLeadCrm("lead-1", { crmStatus: "active" }),
    ).rejects.toBeInstanceOf(AdminLeadValidationError);
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("rejects attempts to mutate identity fields", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      exists: true,
      id: "lead-1",
      data: () => leadData,
    });

    const store = new AdminLeadsStore();

    await expect(
      store.updateLeadCrm("lead-1", { email: "other@example.com" }),
    ).rejects.toBeInstanceOf(AdminLeadValidationError);
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("patches CRM fields on leads only and never touches client_cases", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      exists: true,
      id: "lead-1",
      data: () => leadData,
    });

    const store = new AdminLeadsStore();
    const result = await store.updateLeadCrm("lead-1", {
      crmStatus: "contacted",
      crmPriority: "high",
      crmNotes: "Relance WhatsApp prévue.",
    });

    expect(result).toMatchObject({
      canonicalCrmStatus: "CONTACTED",
      crmStatus: "contacted",
      crmPriority: "high",
      crmNotes: "Relance WhatsApp prévue.",
    });
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        crmStatus: "contacted",
        crmPriority: "high",
        crmNotes: "Relance WhatsApp prévue.",
        lastContactedAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
      { merge: true },
    );
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
  });
});
