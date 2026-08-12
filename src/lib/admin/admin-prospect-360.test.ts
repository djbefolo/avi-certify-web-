import { afterEach, describe, expect, it, vi } from "vitest";
import { addProspectInternalNote, composeProspect360ReadModel, type Prospect360Source } from "@/lib/admin/admin-prospect-360";
import { getAdminLeadsStore } from "@/lib/admin/admin-leads-store";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { AdminLead } from "@/types/admin-crm";

function lead(overrides: Partial<AdminLead> = {}): AdminLead {
  return {
    id: "lead-1",
    fullName: "Awa Prospect",
    email: "awa@example.com",
    normalizedEmail: "awa@example.com",
    phone: "+237600000000",
    residenceCountry: "Cameroun",
    destinationCountry: "France",
    requestedService: "guide_france_2026",
    projectHorizon: "2026",
    message: null,
    source: "GUIDE_DOWNLOAD",
    sourceDetail: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    marketingConsent: true,
    contactConsent: true,
    linkedUid: "user-1234567890",
    linkedAt: "2026-08-10T12:00:00.000Z",
    linkMethod: "VERIFIED_EMAIL",
    identityLinkStatus: "LINKED",
    linkConflictReason: null,
    rawSource: null,
    rawStatus: null,
    canonicalCrmStatus: "CONTACTED",
    country: "Cameroun",
    serviceInterest: "guide_france_2026",
    origin: null,
    status: null,
    referrer: null,
    guideRequested: true,
    guideDelivered: true,
    guideDeliveryStatus: "READY",
    guideDeliveryChannel: "client_space",
    guideEmailSent: true,
    guideEmailStatus: "SENT",
    crmStatus: "contacted",
    crmPriority: "normal",
    crmOwner: "admin-1",
    crmNotes: "Note historique",
    lastContactedAt: null,
    qualifiedAt: null,
    qualifiedBy: null,
    qualificationReasons: [],
    convertedAt: null,
    lostReason: null,
    nextAction: "FOLLOW_UP",
    nextActionDueAt: "2026-08-14T12:00:00.000Z",
    followUpReason: "PROFILE_INCOMPLETE_AFTER_REMINDER",
    nextActionSource: "SYSTEM_PROFILE_REMINDER",
    nextActionUpdatedAt: null,
    nextActionUpdatedBy: null,
    qualificationReadiness: "READY_FOR_REVIEW",
    qualificationMissingFields: [],
    profileReadiness: "SUFFICIENT_FOR_QUALIFICATION",
    profileCompletionPercent: 60,
    linkedAccountEmailVerified: true,
    humanFollowUpRequired: true,
    createdAt: "2026-08-09T12:00:00.000Z",
    updatedAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

function source(overrides: Partial<Prospect360Source> = {}): Prospect360Source {
  return {
    lead: lead(),
    account: { profile: null, createdAt: "2026-08-10T11:00:00.000Z", emailVerifiedAt: "2026-08-10T11:30:00.000Z", disabled: false },
    communications: [
      { id: "welcome", caseId: null, uid: "user-1234567890", type: "EMAIL", template: "auth_welcome", recipient: "awa@example.com", status: "SENT", provider: "resend", messageId: null, sentAt: "2026-08-10T11:31:00.000Z", createdAt: "2026-08-10T11:30:00.000Z" },
      { id: "reminder", caseId: null, uid: "user-1234567890", type: "EMAIL", template: "onboarding_profile_reminder_24h", recipient: "awa@example.com", status: "SENT", provider: "resend", messageId: null, attemptCount: 1, humanFollowUpStatus: "ACTIVE", humanFollowUpDueAt: "2026-08-14T12:00:00.000Z", sentAt: "2026-08-11T11:30:00.000Z", createdAt: "2026-08-11T11:30:00.000Z" },
    ],
    documents: [
      { id: "doc-1", uid: "user-1234567890", caseId: null, documentType: "passport", fileName: "passport.pdf", storagePath: "private/path.pdf", downloadUrl: null, uploadStatus: "uploaded", verificationStatus: "UPLOADED", rejectionReason: null, uploadedAt: "2026-08-11T10:00:00.000Z", verifiedAt: null, verifiedBy: null },
    ],
    notifications: [],
    events: [
      { id: "note-1", caseId: null, uid: "user-1234567890", actorType: "admin", actorId: "admin-1", actorRole: "admin", eventType: "lead_internal_note_added", eventLabel: "Note interne prospect ajoutée", eventPayload: { leadId: "lead-1", note: "Rappeler jeudi" }, createdAt: "2026-08-12T10:00:00.000Z" },
    ],
    cases: [],
    payments: [],
    ...overrides,
  };
}

describe("composeProspect360ReadModel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds onboarding, communication, document and append-only note views", () => {
    const result = composeProspect360ReadModel(source());
    expect(result.account).toMatchObject({ status: "ACTIVE", uidMasked: "user-123…7890" });
    expect(result.onboarding).toMatchObject({ welcomeEmailStatus: "SENT", profileReminderStatus: "SENT", reminderAttemptCount: 1, humanFollowUpStatus: "ACTIVE" });
    expect(result.documents).toEqual([expect.objectContaining({ id: "doc-1", previewUrl: "/api/admin/documents/doc-1/preview" })]);
    expect(result.notes.map((item) => item.note)).toEqual(["Rappeler jeudi", "Note historique"]);
    expect(result.timeline.map((item) => item.label)).toContain("Email vérifié");
  });

  it.each(["AMBIGUOUS", "CONFLICT"] as const)("does not resolve UID-derived data for %s identities", (identityLinkStatus) => {
    const result = composeProspect360ReadModel(source({ lead: lead({ identityLinkStatus }), communications: [{ ...source().communications[0], recipient: "other@example.com" }] }));
    expect(result.account.status).toBe("NOT_LINKED");
    expect(result.account.uidMasked).toBeNull();
    expect(result.communications).toEqual([]);
    expect(result.documents).toEqual([]);
  });

  it("can associate an exact recipient email without inventing an account link", () => {
    const result = composeProspect360ReadModel(source({ lead: lead({ identityLinkStatus: "UNLINKED", linkedUid: null }), documents: [] }));
    expect(result.account.status).toBe("NOT_LINKED");
    expect(result.communications).toHaveLength(2);
  });

  it("never exposes document storage paths or provider error payloads", () => {
    const result = composeProspect360ReadModel(source({ communications: [{ ...source().communications[0], error: { code: "provider_secret", message: "raw detail", retryable: false } }] }));
    expect(JSON.stringify(result)).not.toContain("private/path.pdf");
    expect(JSON.stringify(result)).not.toContain("provider_secret");
    expect(JSON.stringify(result)).not.toContain("raw detail");
  });

  it("sorts the unified timeline newest first", () => {
    const result = composeProspect360ReadModel(source());
    const timestamps = result.timeline.map((item) => Date.parse(item.occurredAt));
    expect(timestamps).toEqual([...timestamps].sort((left, right) => right - left));
  });

  it("handles missing optional account and onboarding data", () => {
    const result = composeProspect360ReadModel(source({
      lead: lead({ identityLinkStatus: "UNLINKED", linkedUid: null, phone: null, crmNotes: null }),
      account: { profile: null, createdAt: null, emailVerifiedAt: null, disabled: null },
      communications: [],
      documents: [],
      events: [],
    }));
    expect(result.account).toMatchObject({ status: "NOT_LINKED", uidMasked: null });
    expect(result.onboarding.welcomeEmailStatus).toBeNull();
    expect(result.notes).toEqual([]);
  });

  it("excludes unrelated admin notifications", () => {
    const result = composeProspect360ReadModel(source({ notifications: [{ id: "other", type: "admin_action_required", severity: "warning", title: "Autre prospect", body: "Sans rapport", relatedUid: "other-user", relatedCaseId: null, read: false, metadata: { leadId: "lead-other" }, createdAt: "2026-08-12T11:00:00.000Z" }] }));
    expect(result.timeline.map((item) => item.label)).not.toContain("Autre prospect");
  });

  it("includes a directly linked internal notification", () => {
    const result = composeProspect360ReadModel(source({ notifications: [{ id: "follow-up", type: "admin_action_required", severity: "warning", title: "Intervention humaine requise", body: "Profil incomplet", relatedUid: "user-1234567890", relatedCaseId: null, read: false, metadata: { leadId: "lead-1" }, createdAt: "2026-08-12T11:00:00.000Z" }] }));
    expect(result.timeline.map((item) => item.label)).toContain("Intervention humaine requise");
  });

  it("does not include UID cases or payments for an unlinked lead", () => {
    const result = composeProspect360ReadModel(source({
      lead: lead({ identityLinkStatus: "UNLINKED", linkedUid: null }),
      cases: [{ id: "case-1", uid: "user-1234567890", caseNumber: "AVI-1", productType: "TO_QUALIFY", status: "NEW", requestedAmount: null, requestedCurrency: null, destinationCountry: null, schoolName: null, intakeDate: null, notes: null, createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z" }],
      payments: [{ id: "payment-1", ownerId: "user-1234567890", status: "paid", createdAt: "2026-08-12T10:01:00.000Z" }],
    }));
    expect(result.timeline.map((item) => item.label).some((label) => label.startsWith("Dossier lié") || label.startsWith("Paiement lié"))).toBe(false);
  });

  it("keeps documents visible without requiring a client case", () => {
    const result = composeProspect360ReadModel(source({ cases: [] }));
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].documentType).toBe("passport");
  });

  it("renders technical timeline states with human-readable labels", () => {
    const result = composeProspect360ReadModel(source({
      cases: [{ id: "case-1", uid: "user-1234567890", caseNumber: "AVI-1", productType: "TO_QUALIFY", status: "PAYMENT_PENDING", requestedAmount: null, requestedCurrency: null, destinationCountry: null, schoolName: null, intakeDate: null, notes: null, createdAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z" }],
      payments: [{ id: "payment-1", ownerId: "user-1234567890", caseId: "case-1", status: "paid", createdAt: "2026-08-12T10:01:00.000Z" }],
    }));
    expect(result.timeline.map((item) => item.label)).toEqual(expect.arrayContaining([
      "Dossier lié · Paiement en attente",
      "Paiement lié · Payé",
      "Document reçu · Passeport",
      "Email de bienvenue · Envoyée",
    ]));
    expect(JSON.stringify(result.timeline)).not.toContain("PAYMENT_PENDING");
  });

  it("appends a lead-scoped note with no client case or synthetic client", async () => {
    vi.spyOn(getAdminLeadsStore(), "getLead").mockResolvedValueOnce(
      lead({ identityLinkStatus: "UNLINKED", linkedUid: null }),
    );
    const createEvent = vi
      .spyOn(getAdminOperationsStore(), "createEvent")
      .mockResolvedValueOnce({
        id: "case_evt_note-1",
        caseId: null,
        uid: null,
        actorType: "admin",
        actorId: "admin-1",
        actorRole: "admin",
        eventType: "lead_internal_note_added",
        eventLabel: "Note interne prospect ajoutée",
        eventPayload: { leadId: "lead-1", note: "Rappeler jeudi" },
        createdAt: "2026-08-12T10:00:00.000Z",
      });

    const note = await addProspectInternalNote(
      "lead-1",
      "  Rappeler jeudi  ",
      { uid: "admin-1", role: "admin", authProvider: "firebase-session" },
    );

    expect(createEvent).toHaveBeenCalledOnce();
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      caseId: null,
      uid: null,
      eventType: "lead_internal_note_added",
      eventPayload: { leadId: "lead-1", note: "Rappeler jeudi" },
    }));
    expect(note).toMatchObject({ id: "case_evt_note-1", note: "Rappeler jeudi" });
  });
});
