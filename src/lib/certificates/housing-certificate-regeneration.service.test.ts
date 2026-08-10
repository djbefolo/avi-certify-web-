import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

const generatorMocks = vi.hoisted(() => ({
  renderHtml: vi.fn(),
  renderPdf: vi.fn(),
}));

const firebaseMocks = vi.hoisted(() => {
  type Data = Record<string, unknown>;
  const collections = new Map<string, Map<string, Data>>();
  const objects = new Map<string, Buffer>();
  const save = vi.fn();
  const transactionSets = vi.fn();

  function collectionMap(name: string) {
    let map = collections.get(name);
    if (!map) {
      map = new Map<string, Data>();
      collections.set(name, map);
    }
    return map;
  }

  function snapshot(name: string, id: string) {
    const value = collectionMap(name).get(id);
    return {
      id,
      exists: Boolean(value),
      data: () => value,
      get: (field: string) => value?.[field],
    };
  }

  function doc(name: string, id: string) {
    return {
      id,
      get: vi.fn(async () => snapshot(name, id)),
      set: vi.fn(async (value: Data, options?: { merge?: boolean }) => {
        const current = collectionMap(name).get(id) ?? {};
        collectionMap(name).set(id, options?.merge ? { ...current, ...value } : value);
      }),
    };
  }

  function applySet(
    ref: { collectionName: string; id: string },
    value: Data,
    options?: { merge?: boolean },
  ) {
    const current = collectionMap(ref.collectionName).get(ref.id) ?? {};
    collectionMap(ref.collectionName).set(
      ref.id,
      options?.merge ? { ...current, ...value } : value,
    );
    transactionSets(ref.collectionName, ref.id, value, options);
  }

  const firestore = {
    collection: (name: string) => ({
      doc: (id: string) => ({ ...doc(name, id), collectionName: name }),
      where: (field: string, _operator: string, expected: unknown) => ({
        get: vi.fn(async () => ({
          docs: [...collectionMap(name).entries()]
            .filter(([, value]) => value[field] === expected)
            .map(([id]) => snapshot(name, id)),
        })),
      }),
    }),
    runTransaction: vi.fn(
      async (
        handler: (transaction: {
          get: (ref: { collectionName: string; id: string }) => Promise<unknown>;
          set: (
            ref: { collectionName: string; id: string },
            value: Data,
            options?: { merge?: boolean },
          ) => void;
        }) => Promise<unknown>,
      ) =>
        handler({
          get: async (ref) => snapshot(ref.collectionName, ref.id),
          set: applySet,
        }),
    ),
  };

  const bucket = {
    file: (storagePath: string) => ({
      exists: vi.fn(async () => [objects.has(storagePath)]),
      download: vi.fn(async () => {
        const value = objects.get(storagePath);
        if (!value) throw new Error("OBJECT_NOT_FOUND");
        return [value];
      }),
      save: vi.fn(async (buffer: Buffer, options: unknown) => {
        if (objects.has(storagePath)) throw new Error("PRECONDITION_FAILED");
        objects.set(storagePath, Buffer.from(buffer));
        save(storagePath, buffer, options);
      }),
    }),
  };

  return {
    bucket,
    collectionMap,
    collections,
    firestore,
    objects,
    save,
    transactionSets,
  };
});

vi.mock("@/lib/certificates/certificate-generator", () => ({
  renderHousingCertificateHtml: generatorMocks.renderHtml,
  renderHousingCertificatePdfFromHtml: generatorMocks.renderPdf,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => firebaseMocks.firestore,
  getAdminStorage: () => ({ bucket: () => firebaseMocks.bucket }),
}));

import { regenerateHousingCertificateDocumentRevision } from "@/lib/certificates/housing-certificate-regeneration.service";

const certificateId = "case_tYfI6fmDJBTDY5zBubJK-housing-certificate";
const housingRequestId = "tYfI6fmDJBTDY5zBubJK";
const caseId = "case_tYfI6fmDJBTDY5zBubJK";
const ownerId = "owner-1";
const oldVersionId = `${certificateId}_v2`;
const newVersionId = `${certificateId}_v3`;
const oldStoragePath = `users/${ownerId}/documents/${certificateId}-attestation-hebergement.pdf`;
const newStoragePath = `users/${ownerId}/documents/${certificateId}-v3-attestation-hebergement.pdf`;
const oldChecksum = "a".repeat(64);
const verificationToken = "verification-token-preserved";

const input = {
  certificateId,
  certificateReference: "AVI-HBG-2026-CASETYFI",
  housingRequestId,
  caseId,
  allocationVersion: 2,
  documentRevision: 3,
  actorId: "controlled-preview-regeneration",
};

function seedLiveState() {
  const certificateSnapshot = {
    createdAt: "2026-08-10T00:00:00.000Z",
    source: "admin_approval",
    requestId: housingRequestId,
    ownerId,
    caseId,
    paymentId: "KNjadCW5oflfXmkVXvZp",
    student: {
      fullName: "Cécile Gaelle EYENGA",
      email: "student@example.com",
      dateOfBirth: "1988-06-08",
      placeOfBirth: "Yaoundé",
      nationality: "Camerounaise",
      originCountry: "Cameroun",
      expectedArrivalDate: "2026-09-01",
      expectedStayDurationMonths: 12,
      academicYear: "2026-2027",
      schoolName: "Université test",
    },
    housing: {
      inventoryReference: "RENNES-1",
      partnerName: "Partenaire",
      residenceName: "Rennes Villejean",
      addressLine: "4 rue d’Alsace",
      postalCode: "35000",
      city: "Rennes",
      accommodationType: "studio",
      monthlyRent: 610,
      currency: "EUR",
      confirmedAt: "2026-08-10",
      confirmationReference: "PARTNER-1",
      validUntil: "2026-09-09",
      allocationReason: "Disponibilité confirmée.",
      allocationVersion: 2,
      approvedBy: "admin-1",
      approvedAt: "2026-08-10T00:00:00.000Z",
    },
    inventoryVersion: 1,
  };
  firebaseMocks.collectionMap("certificates").set(certificateId, {
    ownerId,
    caseId,
    housingRequestId,
    status: "ACTIVE",
    certificateNumber: input.certificateReference,
    verificationToken,
    verificationUrl: `https://www.avicertify.fr/verifier/${verificationToken}`,
    storagePath: oldStoragePath,
    checksumSha256: oldChecksum,
    issuedAt: "2026-08-10T00:00:00.000Z",
  });
  firebaseMocks.collectionMap("housing_requests").set(housingRequestId, {
    id: housingRequestId,
    ownerId,
    caseId,
    status: "certificate_delivered",
    generatedDocumentId: certificateId,
    allocation: certificateSnapshot.housing,
    certificateSnapshot,
  });
  firebaseMocks.collectionMap("client_cases").set(caseId, {
    id: caseId,
    uid: ownerId,
    housingRequestId,
    status: "CERTIFICATE_GENERATED",
  });
  const currentDocument = {
    ownerId,
    caseId,
    housingRequestId,
    storagePath: oldStoragePath,
    checksumSha256: oldChecksum,
    version: 2,
  };
  firebaseMocks.collectionMap("documents").set(certificateId, currentDocument);
  firebaseMocks.collectionMap("client_documents").set(certificateId, currentDocument);
  firebaseMocks.collectionMap("document_versions").set(oldVersionId, {
    certificateId,
    documentId: certificateId,
    ownerId,
    caseId,
    housingRequestId,
    version: 2,
    storagePath: oldStoragePath,
    checksumSha256: oldChecksum,
    status: "ACTIVE",
  });
  firebaseMocks.objects.set(oldStoragePath, Buffer.from("old-pdf"));
}

describe("controlled housing certificate document regeneration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    firebaseMocks.collections.clear();
    firebaseMocks.objects.clear();
    seedLiveState();
    const pdf = await PDFDocument.create();
    pdf.addPage([595.28, 841.89]);
    generatorMocks.renderPdf.mockResolvedValue(Buffer.from(await pdf.save()));
    generatorMocks.renderHtml.mockResolvedValue(`
      <main>
        <img class="wordmark" src="data:image/png;base64,logo" />
        <div>ATTESTATION CONDITIONNELLE DE LOGEMENT</div>
        <p>Je soussigné, BEFOLO NKOA Gabriel Emmanuel</p>
        <p>AVI-HBG-2026-CASETYFI</p>
        <p>Cécile Gaelle EYENGA, née le 8 juin 1988 à Yaoundé, de nationalité Camerounaise.</p>
        <p>4 rue d’Alsace, 35000 Rennes, 610 EUR</p>
        <p>1 septembre 2026, 12 mois</p>
        <img class="qr" src="data:image/png;base64,qr" />
        <img class="signature-stamp" src="data:image/png;base64,signature" />
      </main>
    `);
  });

  it("creates v3, preserves v2 and switches all current pointers atomically", async () => {
    const result = await regenerateHousingCertificateDocumentRevision(input);

    expect(result.status).toBe("success");
    expect(result.idempotentReplay).toBe(false);
    expect(result.newDocumentVersionId).toBe(newVersionId);
    expect(result.newStoragePath).toBe(newStoragePath);
    expect(result.pdfPageCount).toBe(1);
    expect(result.emailSent).toBe(false);
    expect(firebaseMocks.objects.has(oldStoragePath)).toBe(true);
    expect(firebaseMocks.objects.has(newStoragePath)).toBe(true);
    expect(firebaseMocks.collectionMap("document_versions").get(oldVersionId)).toMatchObject({
      status: "REPLACED",
      isCurrent: false,
      replacedByVersionId: newVersionId,
      replacementReason: "template_correction",
    });
    expect(firebaseMocks.collectionMap("document_versions").get(newVersionId)).toMatchObject({
      status: "ACTIVE",
      isCurrent: true,
      allocationVersion: 2,
      documentRevision: 3,
      previousVersionId: oldVersionId,
    });
    for (const name of ["certificates", "documents", "client_documents"]) {
      expect(firebaseMocks.collectionMap(name).get(certificateId)).toMatchObject({
        storagePath: newStoragePath,
        currentDocumentVersionId: newVersionId,
        documentRevision: 3,
      });
    }
    expect(firebaseMocks.collectionMap("housing_requests").get(housingRequestId)).toMatchObject({
      status: "certificate_delivered",
      allocation: { allocationVersion: 2 },
    });
    expect(firebaseMocks.collectionMap("client_cases").get(caseId)).toMatchObject({
      status: "CERTIFICATE_GENERATED",
    });
    expect(firebaseMocks.collectionMap("admin_case_events").size).toBe(1);
    expect(firebaseMocks.collectionMap("certificates").get(certificateId)?.verificationToken).toBe(
      verificationToken,
    );
  });

  it("aborts without any write when a live precondition differs", async () => {
    firebaseMocks.collectionMap("housing_requests").get(housingRequestId)!.status =
      "certificate_generated";

    await expect(regenerateHousingCertificateDocumentRevision(input)).rejects.toThrow(
      "CONTROLLED_REGENERATION_ABORT:HOUSING_REQUEST_STATUS_CHANGED",
    );
    expect(firebaseMocks.save).not.toHaveBeenCalled();
    expect(firebaseMocks.transactionSets).not.toHaveBeenCalled();
    expect(firebaseMocks.collectionMap("document_versions").has(newVersionId)).toBe(false);
  });

  it("is a read-only replay after the exact revision is already current", async () => {
    await regenerateHousingCertificateDocumentRevision(input);
    vi.clearAllMocks();

    const replay = await regenerateHousingCertificateDocumentRevision(input);

    expect(replay.idempotentReplay).toBe(true);
    expect(replay.newDocumentVersionId).toBe(newVersionId);
    expect(firebaseMocks.save).not.toHaveBeenCalled();
    expect(firebaseMocks.transactionSets).not.toHaveBeenCalled();
    expect(firebaseMocks.collectionMap("admin_case_events").size).toBe(1);
  });
});
