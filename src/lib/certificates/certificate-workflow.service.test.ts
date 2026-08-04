import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateHousingCertificateForCase,
  getPublicCertificateVerificationByToken,
} from "@/lib/certificates/certificate-workflow.service";
import type { ClientCase } from "@/types/admin-ops";

const firebaseMocks = vi.hoisted(() => {
  type StoredDoc = Record<string, unknown>;
  type CollectionMap = Map<string, StoredDoc>;

  const collections = new Map<string, CollectionMap>();
  const getUser = vi.fn();
  const save = vi.fn();

  function collectionMap(name: string) {
    let map = collections.get(name);
    if (!map) {
      map = new Map<string, StoredDoc>();
      collections.set(name, map);
    }
    return map;
  }

  function snapshot(id: string, value: StoredDoc | undefined) {
    return {
      id,
      exists: Boolean(value),
      data: () => value,
      get: (field: string) => value?.[field],
    };
  }

  function docRef(collectionName: string, docId: string) {
    return {
      id: docId,
      get: vi.fn(async () => snapshot(docId, collectionMap(collectionName).get(docId))),
      set: vi.fn(async (value: StoredDoc, options?: { merge?: boolean }) => {
        const map = collectionMap(collectionName);
        const current = map.get(docId) ?? {};
        map.set(docId, options?.merge ? { ...current, ...value } : value);
      }),
      update: vi.fn(async (value: StoredDoc) => {
        const map = collectionMap(collectionName);
        map.set(docId, { ...(map.get(docId) ?? {}), ...value });
      }),
    };
  }

  return {
    collections,
    getUser,
    save,
    collectionMap,
    firestore: {
      collection: (name: string) => ({
        doc: (docId: string) => docRef(name, docId),
        where: (field: string, _operator: string, expected: unknown) => ({
          limit: () => ({
            get: vi.fn(async () => ({
              docs: [...collectionMap(name).entries()]
                .filter(([, value]) => value[field] === expected)
                .map(([id, value]) => snapshot(id, value)),
            })),
          }),
        }),
      }),
    },
  };
});

const opsMocks = vi.hoisted(() => ({
  getCase: vi.fn(),
  createCommunicationLog: vi.fn(),
  createNotification: vi.fn(),
  createEvent: vi.fn(),
}));

const emailMock = vi.hoisted(() => vi.fn());
const pdfMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    getUser: firebaseMocks.getUser,
  }),
  getAdminFirestore: () => firebaseMocks.firestore,
  getAdminStorage: () => ({
    bucket: () => ({
      file: () => ({
        save: firebaseMocks.save,
      }),
    }),
  }),
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => opsMocks,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendCertificateAvailableEmailWithResult: emailMock,
}));

vi.mock("@/lib/certificates/certificate-generator", () => ({
  generateHousingCertificatePdf: pdfMock,
  getDefaultCertificateDates: () => ({
    issueDate: "16 juin 2026",
    entryDate: "16 juillet 2026",
  }),
}));

const actor = {
  uid: "admin-1",
  email: "admin@example.com",
  role: "admin" as const,
  authProvider: "firebase-session" as const,
};

const clientCase: ClientCase = {
  id: "case-1",
  uid: "client-1",
  caseNumber: "AVI-2026-000001",
  clientEmail: "student@example.com",
  clientName: "Awa Student",
  productType: "ATTESTATION_HEBERGEMENT",
  status: "PAYMENT_CONFIRMED",
  requestedAmount: null,
  requestedCurrency: null,
  destinationCountry: "France",
  schoolName: "Universite test",
  intakeDate: "2026-09-01",
  notes: null,
  createdAt: "2026-06-01T08:00:00.000Z",
  updatedAt: "2026-06-01T08:00:00.000Z",
};

function seedProfile(overrides: Record<string, unknown> = {}) {
  firebaseMocks.collectionMap("users").set("client-1", {
    fullName: "Awa Student",
    email: "student@example.com",
    dateOfBirth: "2001-02-03",
    placeOfBirth: "Douala",
    nationality: "Camerounaise",
    intendedArrivalDate: "2026-09-01",
    expectedStayDuration: "12",
    preferredHousingCity: "Paris",
    targetSchoolName: "Universite test",
    ...overrides,
  });
}

function seedHousingRequest(overrides: Record<string, unknown> = {}) {
  const request = {
    id: "housing-1",
    ownerId: "client-1",
    caseId: "case-1",
    clientEmail: "student@example.com",
    clientName: "Awa Student",
    serviceType: "conditional_housing_certificate",
    status: "conditionally_reserved",
    studentFirstName: "Awa",
    studentLastName: "Student",
    studentFullName: "Awa Student",
    studentPhone: "+237600000000",
    studentDateOfBirth: "2001-02-03",
    studentPlaceOfBirth: "Douala",
    nationality: "Camerounaise",
    originCountry: "Cameroun",
    currentResidenceCountry: "Cameroun",
    destinationCountry: "France",
    housingInventoryId: "SAFE-001",
    preferredCityCode: "paris_banlieue",
    preferredCity: "Paris banlieue",
    schoolName: "Universite test",
    schoolCity: "Paris",
    academicYear: "2026-2027",
    expectedArrivalDate: "2026-09-01",
    expectedStayDurationMonths: 12,
    accommodationType: "studio",
    indicativeMonthlyRent: 500,
    currency: "EUR",
    paymentId: "payment-1",
    generationJobId: "housing_payment-1",
    allocation: {
      inventoryReference: "SAFE-001",
      partnerName: "Partner test",
      residenceName: "Residence test",
      addressLine: "1 rue Test",
      postalCode: "75000",
      city: "Paris",
      accommodationType: "studio",
      monthlyRent: 500,
      currency: "EUR",
      confirmedAt: "2026-06-15",
      confirmationReference: "EMAIL-001",
      validUntil: "2026-09-30",
      allocationReason: "Confirmation partenaire.",
      allocationVersion: 1,
      approvedBy: "admin-1",
      approvedAt: "2026-06-15T10:00:00.000Z",
    },
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-06-16T08:00:00.000Z",
    ...overrides,
  };
  const allocation = request.allocation as Record<string, unknown> | null;
  const certificateSnapshot = allocation
    ? {
        createdAt: "2026-06-15T10:00:00.000Z",
        source: "admin_approval",
        requestId: "housing-1",
        ownerId: "client-1",
        caseId: "case-1",
        paymentId: "payment-1",
        student: {
          fullName: request.studentFullName,
          email: request.clientEmail,
          dateOfBirth: request.studentDateOfBirth,
          placeOfBirth: request.studentPlaceOfBirth,
          nationality: request.nationality,
          originCountry: request.originCountry,
          expectedArrivalDate: request.expectedArrivalDate,
          expectedStayDurationMonths: request.expectedStayDurationMonths,
          academicYear: request.academicYear,
          schoolName: request.schoolName,
        },
        housing: allocation,
        inventoryVersion: 1,
      }
    : null;
  firebaseMocks.collectionMap("housing_requests").set("housing-1", {
    ...request,
    certificateSnapshot,
  });
}

function seedPaidHousingPayment(overrides: Record<string, unknown> = {}) {
  firebaseMocks.collectionMap("payments").set("payment-1", {
    ownerId: "client-1",
    housingRequestId: "housing-1",
    serviceType: "accommodation_certificate",
    status: "paid",
    amountTotal: 7900,
    currency: "eur",
    lastStripeEventId: "evt_checkout_paid",
    ...overrides,
  });
}

describe("certificate workflow service", () => {
  beforeEach(() => {
    firebaseMocks.collections.clear();
    vi.clearAllMocks();
    opsMocks.getCase.mockResolvedValue(clientCase);
    opsMocks.createCommunicationLog.mockResolvedValue({ id: "comm-1" });
    opsMocks.createNotification.mockResolvedValue({ id: "note-1" });
    opsMocks.createEvent.mockResolvedValue({ id: "evt-1" });
    firebaseMocks.getUser.mockResolvedValue({
      email: "student@example.com",
      displayName: "Awa Student",
    });
    firebaseMocks.save.mockResolvedValue(undefined);
    emailMock.mockResolvedValue({
      sent: true,
      messageId: "email-1",
      status: "SENT",
      provider: "resend",
    });
    pdfMock.mockResolvedValue(Buffer.from("%PDF-certificate"));
    seedProfile();
    seedHousingRequest();
    seedPaidHousingPayment();
  });

  it("generates a housing certificate, client document, timeline event, and email log", async () => {
    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(true);
    expect(result.message).toBe("Attestation generee.");
    expect(result.email.status).toBe("SENT");
    expect(firebaseMocks.save).toHaveBeenCalledWith(
      Buffer.from("%PDF-certificate"),
      expect.objectContaining({
        contentType: "application/pdf",
        metadata: {
          metadata: expect.objectContaining({
            ownerId: "client-1",
            uid: "client-1",
            caseId: "case-1",
            documentType: "accommodation_certificate",
            certificateId: "case-1-housing-certificate",
          }),
        },
      }),
    );
    expect(
      firebaseMocks.collectionMap("documents").get("case-1-housing-certificate"),
    ).toEqual(
      expect.objectContaining({
        ownerId: "client-1",
        caseId: "case-1",
        documentType: "accommodation_certificate",
        status: "generated",
        verificationStatus: "APPROVED",
      }),
    );
    expect(
      firebaseMocks
        .collectionMap("client_documents")
        .get("case-1-housing-certificate"),
    ).toEqual(
      expect.objectContaining({
        uid: "client-1",
        caseId: "case-1",
        verificationStatus: "APPROVED",
      }),
    );
    expect(opsMocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "certificate_generated",
        eventPayload: expect.objectContaining({ emailStatus: "SENT" }),
      }),
    );
    expect(opsMocks.createCommunicationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        template: "certificate-available",
        status: "SENT",
      }),
    );
  });

  it("blocks a linked conditional housing request until partner allocation is confirmed", async () => {
    seedHousingRequest({
      status: "allocation_pending",
      allocation: null,
    });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
      housingRequestId: "housing-1",
    });

    expect(result).toEqual(
      expect.objectContaining({
        generated: false,
        reason: "allocation_not_confirmed",
      }),
    );
    expect(pdfMock).not.toHaveBeenCalled();
    expect(firebaseMocks.save).not.toHaveBeenCalled();
  });

  it("blocks generation when required profile fields are missing", async () => {
    seedHousingRequest({
      studentDateOfBirth: null,
      preferredCity: null,
    });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(false);
    expect(result.reason).toBe("missing_profile_data");
    expect(result.message).toContain("profil incomplet");
    expect(result.missingFieldLabels).toEqual(
      expect.arrayContaining([
        "date de naissance",
        "ville ou adresse d'hebergement",
      ]),
    );
    expect(result.missingProfileFields).toEqual(
      expect.arrayContaining(["dateOfBirth", "preferredHousingCity"]),
    );
    expect(firebaseMocks.save).not.toHaveBeenCalled();
    expect(
      firebaseMocks
        .collectionMap("certificates")
        .get("case-1-housing-certificate"),
    ).toEqual(
      expect.objectContaining({
        status: "PENDING_PROFILE",
        missingProfileFields: expect.arrayContaining([
          "dateOfBirth",
          "preferredHousingCity",
        ]),
      }),
    );
    expect(opsMocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "certificate_generation_blocked",
        eventPayload: expect.objectContaining({
          reason: "missing_profile_data",
          message: expect.stringContaining("profil incomplet"),
          missingFieldLabels: expect.arrayContaining([
            "date de naissance",
            "ville ou adresse d'hebergement",
          ]),
        }),
      }),
    );
  });

  it("blocks generation when payment is not confirmed", async () => {
    opsMocks.getCase.mockResolvedValue({
      ...clientCase,
      status: "DOCUMENTS_PENDING",
      paymentStatus: "PENDING",
    });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(false);
    expect(result.reason).toBe("payment_not_confirmed");
    expect(result.message).toContain("paiement");
    expect(firebaseMocks.save).not.toHaveBeenCalled();
    expect(
      firebaseMocks
        .collectionMap("certificates")
        .get("case-1-housing-certificate"),
    ).toEqual(
      expect.objectContaining({
        status: "DRAFT",
        blockedReason: "payment_not_confirmed",
        generationBlockedReason: expect.stringContaining("paiement"),
      }),
    );
    expect(opsMocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "certificate_generation_blocked",
        eventPayload: expect.objectContaining({
          reason: "payment_not_confirmed",
          message: expect.stringContaining("paiement"),
        }),
      }),
    );
  });

  it("keeps the generated document valid when the delivery email fails", async () => {
    emailMock.mockResolvedValue({
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(true);
    expect(result.email.status).toBe("SEND_FAILED");
    expect(
      firebaseMocks.collectionMap("certificates").get("case-1-housing-certificate"),
    ).toEqual(expect.objectContaining({ status: "ACTIVE" }));
    expect(firebaseMocks.collectionMap("housing_requests").get("housing-1")).toEqual(
      expect.objectContaining({ status: "certificate_generated" }),
    );
    expect(opsMocks.createCommunicationLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "FAILED" }),
    );
  });

  it("reuses the deterministic document on generation retry", async () => {
    const first = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });
    const second = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(first.generated).toBe(true);
    expect(second).toEqual(
      expect.objectContaining({
        generated: false,
        reason: "certificate_already_exists",
        certificateId: first.certificateId,
      }),
    );
    expect(pdfMock).toHaveBeenCalledTimes(1);
    expect(firebaseMocks.save).toHaveBeenCalledTimes(1);
    expect(emailMock).toHaveBeenCalledTimes(1);
  });

  it("blocks direct admin generation when the persisted Stripe payment is not paid", async () => {
    seedPaidHousingPayment({ status: "pending" });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result).toEqual(
      expect.objectContaining({
        generated: false,
        reason: "payment_not_confirmed",
      }),
    );
    expect(pdfMock).not.toHaveBeenCalled();
    expect(firebaseMocks.save).not.toHaveBeenCalled();
  });

  it("returns only public verification metadata for active certificates", async () => {
    firebaseMocks.collectionMap("certificates").set("cert-1", {
      verificationToken: "a".repeat(64),
      status: "ACTIVE",
      certificateNumber: "AVI-HBG-2026-CASE1",
      studentFullName: "Awa Student",
      storagePath: "users/client-1/documents/private.pdf",
      ownerId: "client-1",
      createdAt: "2026-06-16T10:00:00.000Z",
    });

    const certificate = await getPublicCertificateVerificationByToken(
      "a".repeat(64),
    );

    expect(certificate).toEqual({
      id: "cert-1",
      reference: "AVI-HBG-2026-CASE1",
      status: "ACTIVE",
      valid: true,
      validityStatus: "ACTIVE",
      documentType: "accommodation_certificate",
      certificateType: "housing_accommodation",
      studentFullName: "Awa Student",
      issueDate: "2026-06-16T10:00:00.000Z",
      validUntil: null,
      city: null,
      issuer: "AVI CERTIFY",
    });
    expect(certificate).not.toHaveProperty("storagePath");
    expect(certificate).not.toHaveProperty("ownerId");
  });

  it("keeps revoked public verification invalid and hides the student name", async () => {
    firebaseMocks.collectionMap("certificates").set("cert-2", {
      verificationToken: "b".repeat(64),
      status: "REVOKED",
      certificateNumber: "AVI-HBG-2026-CASE2",
      studentFullName: "Awa Student",
      createdAt: "2026-06-16T10:00:00.000Z",
    });

    const certificate = await getPublicCertificateVerificationByToken(
      "b".repeat(64),
    );

    expect(certificate).toEqual(
      expect.objectContaining({
        status: "REVOKED",
        valid: false,
        studentFullName: null,
      }),
    );
  });

  it("treats an active certificate past its validity date as expired", async () => {
    firebaseMocks.collectionMap("certificates").set("cert-3", {
      verificationToken: "c".repeat(64),
      status: "ACTIVE",
      certificateNumber: "AVI-HBG-2026-CASE3",
      studentFullName: "Awa Student",
      city: "Paris",
      validUntil: "2020-01-01T00:00:00.000Z",
      createdAt: "2019-12-01T10:00:00.000Z",
    });

    const certificate = await getPublicCertificateVerificationByToken(
      "c".repeat(64),
    );

    expect(certificate).toEqual(
      expect.objectContaining({
        status: "EXPIRED",
        valid: false,
        studentFullName: null,
        city: null,
      }),
    );
  });
});
