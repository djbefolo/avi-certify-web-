import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const docGet = vi.fn();
  const doc = vi.fn(() => ({ get: docGet, set }));
  const listGet = vi.fn();
  const limit = vi.fn(() => ({ get: listGet }));
  const orderBy = vi.fn(() => ({ limit }));
  const collection = vi.fn(() => ({ doc, orderBy }));
  const getAll = vi.fn();

  return {
    collection,
    doc,
    docGet,
    getAdminFirestore: vi.fn(() => ({ collection, getAll })),
    getAll,
    limit,
    listGet,
    orderBy,
    set,
  };
});

const auditMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    createEvent: auditMocks.createEvent,
  }),
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

const actor = {
  uid: "admin-1",
  role: "admin" as const,
  authProvider: "firebase-session" as const,
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
    firestoreMocks.getAll.mockReset();
    firestoreMocks.limit.mockClear();
    firestoreMocks.listGet.mockReset();
    firestoreMocks.orderBy.mockClear();
    firestoreMocks.set.mockReset();
    auditMocks.createEvent.mockReset();
    auditMocks.createEvent.mockResolvedValue({ id: "case_evt_1" });
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
      identityLinkStatus: "UNLINKED",
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
      identityLinkStatus: "UNLINKED",
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
      identityLinkStatus: "UNLINKED",
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
      store.updateLeadCrm("lead-1", { crmStatus: "active" }, actor),
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
      store.updateLeadCrm(
        "lead-1",
        { email: "other@example.com" },
        actor,
      ),
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
    const result = await store.updateLeadCrm(
      "lead-1",
      {
        crmStatus: "contacted",
        crmPriority: "high",
        crmNotes: "Relance WhatsApp prévue.",
        nextAction: "WHATSAPP_PROSPECT",
        nextActionDueAt: "2026-06-28T10:00:00.000Z",
        followUpReason: "Premier contact commercial.",
      },
      actor,
    );

    expect(result).toMatchObject({
      canonicalCrmStatus: "CONTACTED",
      crmStatus: "contacted",
      crmPriority: "high",
      crmNotes: "Relance WhatsApp prévue.",
      nextAction: "WHATSAPP_PROSPECT",
      nextActionDueAt: "2026-06-28T10:00:00.000Z",
      followUpReason: "Premier contact commercial.",
      nextActionSource: "HUMAN_ADMIN",
      nextActionUpdatedBy: "admin-1",
    });
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        crmStatus: "contacted",
        crmPriority: "high",
        crmNotes: "Relance WhatsApp prévue.",
        nextAction: "WHATSAPP_PROSPECT",
        nextActionDueAt: "2026-06-28T10:00:00.000Z",
        followUpReason: "Premier contact commercial.",
        nextActionSource: "HUMAN_ADMIN",
        nextActionUpdatedAt: expect.any(String),
        nextActionUpdatedBy: "admin-1",
        lastContactedAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
      { merge: true },
    );
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(auditMocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin-1",
        eventType: "lead_crm_updated",
        eventPayload: expect.objectContaining({
          fromCrmStatus: "new",
          toCrmStatus: "contacted",
          nextAction: "WHATSAPP_PROSPECT",
        }),
      }),
    );
  });

  it("qualifies a linked lead without changing identity or creating operational objects", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      exists: true,
      id: "lead-linked",
      data: () => ({
        ...leadData,
        id: "lead-linked",
        crmStatus: "contacted",
        linkedUid: "user-linked",
        identityLinkStatus: "LINKED",
        linkMethod: "VERIFIED_EMAIL",
        destinationCountry: "france",
        requestedService: "hebergement",
        projectHorizon: "septembre-2026",
      }),
    });
    firestoreMocks.getAll.mockResolvedValueOnce([
      {
        exists: true,
        id: "user-linked",
        data: () => ({
          fullName: "Awa Ndiaye",
          email: "awa@example.com",
          phoneWhatsApp: "+237600000000",
          destinationCountry: "france",
          selectedService: "attestation_hebergement",
          emailVerifiedAt: "2026-06-27T11:00:00.000Z",
        }),
      },
    ]);

    const result = await new AdminLeadsStore().updateLeadCrm(
      "lead-linked",
      { crmStatus: "qualified" },
      actor,
    );

    expect(result).toMatchObject({
      crmStatus: "qualified",
      canonicalCrmStatus: "QUALIFIED",
      linkedUid: "user-linked",
      identityLinkStatus: "LINKED",
      linkMethod: "VERIFIED_EMAIL",
      qualifiedBy: "admin-1",
      qualifiedAt: expect.any(String),
      linkedAccountEmailVerified: true,
      profileReadiness: "SUFFICIENT_FOR_QUALIFICATION",
    });
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        crmStatus: "qualified",
        qualifiedAt: expect.any(String),
        qualifiedBy: "admin-1",
        qualificationReasons: expect.arrayContaining([
          "CONTACT_AVAILABLE",
          "PHONE_AVAILABLE",
          "DESTINATION_KNOWN",
          "REQUESTED_SERVICE_KNOWN",
          "IDENTITY_LINKED",
        ]),
      }),
      { merge: true },
    );
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("payments");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("services");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith(
      "housing_requests",
    );
  });

  it("requires explicit ordered transitions and a structured lost reason", async () => {
    firestoreMocks.docGet
      .mockResolvedValueOnce({
        exists: true,
        id: "lead-1",
        data: () => leadData,
      })
      .mockResolvedValueOnce({
        exists: true,
        id: "lead-1",
        data: () => leadData,
      });

    const store = new AdminLeadsStore();

    await expect(
      store.updateLeadCrm("lead-1", { crmStatus: "qualified" }, actor),
    ).rejects.toThrow("new -> qualified");
    await expect(
      store.updateLeadCrm("lead-1", { crmStatus: "lost" }, actor),
    ).rejects.toThrow("structured lost reason");
    expect(firestoreMocks.set).not.toHaveBeenCalled();
  });

  it("marks a lead lost without deleting it and preserves identity history", async () => {
    firestoreMocks.docGet.mockResolvedValueOnce({
      exists: true,
      id: "lead-1",
      data: () => ({
        ...leadData,
        crmStatus: "contacted",
        linkedUid: "user-linked",
        identityLinkStatus: "LINKED",
      }),
    });
    firestoreMocks.getAll.mockResolvedValueOnce([]);

    const result = await new AdminLeadsStore().updateLeadCrm(
      "lead-1",
      {
        crmStatus: "lost",
        lostReason: "NO_RESPONSE",
        nextAction: "FOLLOW_UP",
      },
      actor,
    );

    expect(result).toMatchObject({
      crmStatus: "lost",
      lostReason: "NO_RESPONSE",
      linkedUid: "user-linked",
      identityLinkStatus: "LINKED",
      nextAction: "NONE",
      nextActionDueAt: null,
    });
    expect(firestoreMocks.set).toHaveBeenCalledTimes(1);
  });
});
