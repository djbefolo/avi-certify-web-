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
  });

  it("generates a housing certificate, client document, timeline event, and email log", async () => {
    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(true);
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

  it("blocks generation when required profile fields are missing", async () => {
    seedProfile({ dateOfBirth: null, preferredHousingCity: null });

    const result = await generateHousingCertificateForCase({
      caseId: "case-1",
      actor,
    });

    expect(result.generated).toBe(false);
    expect(result.reason).toBe("missing_profile_data");
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
      }),
    );
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
});
