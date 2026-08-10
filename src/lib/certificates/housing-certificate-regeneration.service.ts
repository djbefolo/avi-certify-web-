import "server-only";

import crypto from "node:crypto";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  formatHousingCertificateRent,
  renderHousingCertificateHtml,
  renderHousingCertificatePdfFromHtml,
} from "@/lib/certificates/certificate-generator";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import type { HousingCertificateSnapshot } from "@/types/housing";

const CERTIFICATES_COLLECTION = "certificates";
const DOCUMENTS_COLLECTION = "documents";
const CLIENT_DOCUMENTS_COLLECTION = "client_documents";
const DOCUMENT_VERSIONS_COLLECTION = "document_versions";
const HOUSING_REQUESTS_COLLECTION = "housing_requests";
const CASES_COLLECTION = "client_cases";
const EVENTS_COLLECTION = "admin_case_events";
const TEMPLATE_VERSION = "housing-conditional-v4";
const REGENERATION_REASON = "template_correction";

type DocumentSnapshotLike = {
  exists: boolean;
  id: string;
  data(): Record<string, unknown> | undefined;
  get(field: string): unknown;
};

export type ControlledHousingCertificateRegenerationInput = {
  certificateId: string;
  certificateReference: string;
  housingRequestId: string;
  caseId: string;
  allocationVersion: number;
  documentRevision: number;
  actorId: string;
};

export type ControlledHousingCertificateRegenerationResult = {
  status: "success";
  idempotentReplay: boolean;
  certificateId: string;
  certificateReference: string;
  oldDocumentVersionId: string;
  newDocumentVersionId: string;
  oldStoragePath: string;
  newStoragePath: string;
  oldChecksum: string;
  newChecksum: string;
  oldVersionStatus: "REPLACED";
  newVersionStatus: "ACTIVE";
  currentDocumentPointer: string;
  pdfPageCount: number;
  verificationIdentityPreserved: boolean;
  allocationVersion: number;
  allocationVersionUnchanged: boolean;
  emailSent: false;
  caseStatus: string;
  housingRequestStatus: string;
  auditEventId: string;
  visualReviewPath: string;
};

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fail(code: string): never {
  throw new Error(`CONTROLLED_REGENERATION_ABORT:${code}`);
}

function formatDate(value: unknown) {
  let date: Date | null = null;
  if (value instanceof Date) {
    date = value;
  } else if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const candidate = value.toDate();
    date = candidate instanceof Date ? candidate : null;
  } else if (typeof value === "string") {
    const candidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    date = Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  if (!date || Number.isNaN(date.getTime())) {
    return cleanString(value) ?? "";
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

function normalizeHtmlText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function asCertificateSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    fail("CERTIFICATE_SNAPSHOT_MISSING");
  }
  return value as HousingCertificateSnapshot;
}

function documentVersionId(certificateId: string, revision: number) {
  return `${certificateId}_v${revision}`;
}

function auditEventId(certificateId: string, revision: number) {
  return `case_evt_housing_template_correction_${certificateId}_v${revision}`;
}

function buildNewStoragePath(oldStoragePath: string, certificateId: string, revision: number) {
  return path.posix.join(
    path.posix.dirname(oldStoragePath),
    `${certificateId}-v${revision}-attestation-hebergement.pdf`,
  );
}

function assertCorePreconditions({
  input,
  certificate,
  housingRequest,
  clientCase,
  publicDocument,
  clientDocument,
  oldVersion,
}: {
  input: ControlledHousingCertificateRegenerationInput;
  certificate: DocumentSnapshotLike;
  housingRequest: DocumentSnapshotLike;
  clientCase: DocumentSnapshotLike;
  publicDocument: DocumentSnapshotLike;
  clientDocument: DocumentSnapshotLike;
  oldVersion: DocumentSnapshotLike;
}) {
  if (!certificate.exists) fail("CERTIFICATE_NOT_FOUND");
  if (certificate.get("status") !== "ACTIVE") fail("CERTIFICATE_NOT_ACTIVE");
  if (certificate.get("certificateNumber") !== input.certificateReference) {
    fail("CERTIFICATE_REFERENCE_MISMATCH");
  }
  if (certificate.get("caseId") !== input.caseId) fail("CERTIFICATE_CASE_MISMATCH");
  if (certificate.get("housingRequestId") !== input.housingRequestId) {
    fail("CERTIFICATE_HOUSING_REQUEST_MISMATCH");
  }
  if (!cleanString(certificate.get("verificationToken"))) {
    fail("VERIFICATION_TOKEN_MISSING");
  }
  if (!cleanString(certificate.get("verificationUrl"))) {
    fail("VERIFICATION_URL_MISSING");
  }

  if (!housingRequest.exists) fail("HOUSING_REQUEST_NOT_FOUND");
  if (housingRequest.get("status") !== "certificate_delivered") {
    fail("HOUSING_REQUEST_STATUS_CHANGED");
  }
  if (housingRequest.get("caseId") !== input.caseId) fail("HOUSING_CASE_MISMATCH");
  if (housingRequest.get("generatedDocumentId") !== input.certificateId) {
    fail("GENERATED_DOCUMENT_ID_MISMATCH");
  }
  const allocation = housingRequest.get("allocation") as Record<string, unknown> | undefined;
  if (allocation?.allocationVersion !== input.allocationVersion) {
    fail("ALLOCATION_VERSION_CHANGED");
  }
  const snapshot = asCertificateSnapshot(housingRequest.get("certificateSnapshot"));
  if (
    snapshot.requestId !== input.housingRequestId ||
    snapshot.caseId !== input.caseId ||
    snapshot.ownerId !== housingRequest.get("ownerId") ||
    snapshot.housing?.allocationVersion !== input.allocationVersion
  ) {
    fail("FROZEN_SNAPSHOT_MISMATCH");
  }

  if (!clientCase.exists) fail("CLIENT_CASE_NOT_FOUND");
  if (clientCase.get("housingRequestId") !== input.housingRequestId) {
    fail("CLIENT_CASE_HOUSING_REQUEST_MISMATCH");
  }
  const ownerId = cleanString(certificate.get("ownerId"));
  if (!ownerId || clientCase.get("uid") !== ownerId || housingRequest.get("ownerId") !== ownerId) {
    fail("OWNER_MISMATCH");
  }

  const oldStoragePath = cleanString(certificate.get("storagePath"));
  const oldChecksum = cleanString(certificate.get("checksumSha256"));
  if (!oldStoragePath) fail("OLD_STORAGE_PATH_MISSING");
  if (!oldChecksum) fail("OLD_CHECKSUM_MISSING");
  if (!publicDocument.exists || !clientDocument.exists || !oldVersion.exists) {
    fail("DOCUMENT_POINTER_MISSING");
  }
  if (
    publicDocument.get("storagePath") !== oldStoragePath ||
    clientDocument.get("storagePath") !== oldStoragePath ||
    oldVersion.get("storagePath") !== oldStoragePath
  ) {
    fail("CURRENT_STORAGE_POINTER_MISMATCH");
  }
  if (
    publicDocument.get("checksumSha256") !== oldChecksum ||
    clientDocument.get("checksumSha256") !== oldChecksum ||
    oldVersion.get("checksumSha256") !== oldChecksum
  ) {
    fail("CURRENT_CHECKSUM_MISMATCH");
  }

  const regeneration = certificate.get("documentRegeneration") as
    | Record<string, unknown>
    | undefined;
  if (regeneration?.status === "processing") {
    fail("REPLACEMENT_ALREADY_IN_PROGRESS");
  }

  return { ownerId, oldStoragePath, oldChecksum, snapshot };
}

function assertRenderedContent(
  html: string,
  input: ControlledHousingCertificateRegenerationInput,
  snapshot: HousingCertificateSnapshot,
) {
  if (/\{\{[a-zA-Z0-9_]+\}\}/.test(html)) fail("UNRESOLVED_TEMPLATE_PLACEHOLDER");
  const text = normalizeHtmlText(html);
  const required = [
    "ATTESTATION CONDITIONNELLE DE LOGEMENT",
    "Je soussigné, BEFOLO NKOA Gabriel Emmanuel",
    input.certificateReference,
    snapshot.student.fullName,
    formatDate(snapshot.student.dateOfBirth),
    snapshot.student.placeOfBirth,
    snapshot.student.nationality,
    snapshot.housing.addressLine,
    `${snapshot.housing.postalCode} ${snapshot.housing.city}`,
    `${formatHousingCertificateRent(snapshot.housing.monthlyRent)} EUR`,
    formatDate(snapshot.student.expectedArrivalDate),
    `${snapshot.student.expectedStayDurationMonths} mois`,
  ];
  for (const expected of required) {
    if (!text.includes(expected)) fail("RENDERED_CONTENT_MISMATCH");
  }
  if (!html.includes('class="wordmark" src="data:image/png;base64,')) {
    fail("LOGO_NOT_INJECTED");
  }
  if (!html.includes('class="signature-stamp" src="data:image/png;base64,')) {
    fail("SIGNATURE_NOT_INJECTED");
  }
  if (!html.includes('class="qr" src="data:image/png;base64,')) fail("QR_NOT_INJECTED");
}

async function validatePdf(pdfBuffer: Buffer) {
  const pdf = await PDFDocument.load(Uint8Array.from(pdfBuffer));
  if (pdf.getPageCount() !== 1) fail("PDF_NOT_SINGLE_PAGE");
  const [page] = pdf.getPages();
  if (
    page.getWidth() < 594 ||
    page.getWidth() > 596 ||
    page.getHeight() < 841 ||
    page.getHeight() > 843
  ) {
    fail("PDF_NOT_A4");
  }
  return pdf.getPageCount();
}

function resultFromState({
  input,
  oldStoragePath,
  newStoragePath,
  oldChecksum,
  newChecksum,
  caseStatus,
  housingRequestStatus,
  pageCount,
  idempotentReplay,
}: {
  input: ControlledHousingCertificateRegenerationInput;
  oldStoragePath: string;
  newStoragePath: string;
  oldChecksum: string;
  newChecksum: string;
  caseStatus: string;
  housingRequestStatus: string;
  pageCount: number;
  idempotentReplay: boolean;
}): ControlledHousingCertificateRegenerationResult {
  return {
    status: "success",
    idempotentReplay,
    certificateId: input.certificateId,
    certificateReference: input.certificateReference,
    oldDocumentVersionId: documentVersionId(input.certificateId, input.allocationVersion),
    newDocumentVersionId: documentVersionId(input.certificateId, input.documentRevision),
    oldStoragePath,
    newStoragePath,
    oldChecksum,
    newChecksum,
    oldVersionStatus: "REPLACED",
    newVersionStatus: "ACTIVE",
    currentDocumentPointer: newStoragePath,
    pdfPageCount: pageCount,
    verificationIdentityPreserved: true,
    allocationVersion: input.allocationVersion,
    allocationVersionUnchanged: true,
    emailSent: false,
    caseStatus,
    housingRequestStatus,
    auditEventId: auditEventId(input.certificateId, input.documentRevision),
    visualReviewPath: `/api/admin/documents/${encodeURIComponent(input.certificateId)}/preview`,
  };
}

export async function regenerateHousingCertificateDocumentRevision(
  input: ControlledHousingCertificateRegenerationInput,
) {
  if (input.documentRevision <= input.allocationVersion) {
    fail("DOCUMENT_REVISION_NOT_DISTINCT");
  }

  const db = getAdminFirestore();
  const storage = getAdminStorage().bucket();
  const certificateRef = db.collection(CERTIFICATES_COLLECTION).doc(input.certificateId);
  const housingRequestRef = db
    .collection(HOUSING_REQUESTS_COLLECTION)
    .doc(input.housingRequestId);
  const caseRef = db.collection(CASES_COLLECTION).doc(input.caseId);
  const publicDocumentRef = db.collection(DOCUMENTS_COLLECTION).doc(input.certificateId);
  const clientDocumentRef = db
    .collection(CLIENT_DOCUMENTS_COLLECTION)
    .doc(input.certificateId);
  const oldVersionRef = db
    .collection(DOCUMENT_VERSIONS_COLLECTION)
    .doc(documentVersionId(input.certificateId, input.allocationVersion));
  const newVersionRef = db
    .collection(DOCUMENT_VERSIONS_COLLECTION)
    .doc(documentVersionId(input.certificateId, input.documentRevision));
  const eventRef = db
    .collection(EVENTS_COLLECTION)
    .doc(auditEventId(input.certificateId, input.documentRevision));

  const [certificate, housingRequest, clientCase, publicDocument, clientDocument, oldVersion, newVersion] =
    (await Promise.all([
      certificateRef.get(),
      housingRequestRef.get(),
      caseRef.get(),
      publicDocumentRef.get(),
      clientDocumentRef.get(),
      oldVersionRef.get(),
      newVersionRef.get(),
    ])) as DocumentSnapshotLike[];

  if (newVersion.exists) {
    const oldStoragePath = cleanString(oldVersion.get("storagePath"));
    const oldChecksum = cleanString(oldVersion.get("checksumSha256"));
    const newStoragePath = cleanString(newVersion.get("storagePath"));
    const newChecksum = cleanString(newVersion.get("checksumSha256"));
    const allocation = housingRequest.get("allocation") as Record<string, unknown> | undefined;
    if (
      certificate.get("status") !== "ACTIVE" ||
      certificate.get("certificateNumber") !== input.certificateReference ||
      certificate.get("caseId") !== input.caseId ||
      certificate.get("housingRequestId") !== input.housingRequestId ||
      certificate.get("currentDocumentVersionId") !== newVersion.id ||
      certificate.get("storagePath") !== newStoragePath ||
      certificate.get("checksumSha256") !== newChecksum ||
      !cleanString(certificate.get("verificationToken")) ||
      !cleanString(certificate.get("verificationUrl")) ||
      housingRequest.get("status") !== "certificate_delivered" ||
      housingRequest.get("generatedDocumentId") !== input.certificateId ||
      allocation?.allocationVersion !== input.allocationVersion ||
      !housingRequest.get("certificateSnapshot") ||
      oldVersion.get("status") !== "REPLACED" ||
      oldVersion.get("isCurrent") !== false ||
      newVersion.get("status") !== "ACTIVE" ||
      newVersion.get("isCurrent") !== true ||
      newVersion.get("allocationVersion") !== input.allocationVersion ||
      publicDocument.get("storagePath") !== newStoragePath ||
      clientDocument.get("storagePath") !== newStoragePath ||
      !oldStoragePath ||
      !oldChecksum ||
      !newStoragePath ||
      !newChecksum
    ) {
      fail("DOCUMENT_REVISION_CONFLICT");
    }
    const [oldStorageExists, newStorageExists] = await Promise.all([
      storage.file(oldStoragePath).exists(),
      storage.file(newStoragePath).exists(),
    ]);
    if (!oldStorageExists[0]) fail("OLD_PDF_STORAGE_MISSING");
    if (!newStorageExists[0]) fail("CURRENT_REVISION_STORAGE_MISSING");
    const currentPdf = await storage.file(newStoragePath).download();
    const pageCount = await validatePdf(currentPdf[0]);
    return resultFromState({
      input,
      oldStoragePath,
      newStoragePath,
      oldChecksum,
      newChecksum,
      caseStatus: String(clientCase.get("status") ?? "unknown"),
      housingRequestStatus: String(housingRequest.get("status") ?? "unknown"),
      pageCount,
      idempotentReplay: true,
    });
  }

  const core = assertCorePreconditions({
    input,
    certificate,
    housingRequest,
    clientCase,
    publicDocument,
    clientDocument,
    oldVersion,
  });
  const newStoragePath = buildNewStoragePath(
    core.oldStoragePath,
    input.certificateId,
    input.documentRevision,
  );

  const versions = await db
    .collection(DOCUMENT_VERSIONS_COLLECTION)
    .where("certificateId", "==", input.certificateId)
    .get();
  if (
    versions.docs.some((version: DocumentSnapshotLike) => {
      const status = String(version.get("status") ?? "").toUpperCase();
      return ["PROCESSING", "PENDING", "REGENERATING"].includes(status);
    })
  ) {
    fail("REPLACEMENT_ALREADY_IN_PROGRESS");
  }
  if (
    versions.docs.some(
      (version: DocumentSnapshotLike) =>
        version.id !== oldVersion.id && Number(version.get("documentRevision") ?? version.get("version")) >= input.documentRevision,
    )
  ) {
    fail("LATER_DOCUMENT_REVISION_EXISTS");
  }

  const [oldStorageExists] = await storage.file(core.oldStoragePath).exists();
  if (!oldStorageExists) fail("OLD_PDF_STORAGE_MISSING");
  const verificationUrl = cleanString(certificate.get("verificationUrl"));
  if (!verificationUrl) fail("VERIFICATION_URL_MISSING");
  const issuedAt = formatDate(certificate.get("issuedAt"));
  if (!issuedAt) fail("ISSUED_AT_MISSING");

  const html = await renderHousingCertificateHtml({
    certificateReference: input.certificateReference,
    certificateStatus: "CONDITIONNELLE",
    studentFullName: core.snapshot.student.fullName,
    studentDateOfBirth: formatDate(core.snapshot.student.dateOfBirth),
    studentPlaceOfBirth: core.snapshot.student.placeOfBirth,
    studentNationality: core.snapshot.student.nationality,
    housing: {
      city: core.snapshot.housing.city,
      addressLine: core.snapshot.housing.addressLine,
      postalCode: core.snapshot.housing.postalCode,
      monthlyRent: core.snapshot.housing.monthlyRent,
    },
    expectedArrivalDate: formatDate(core.snapshot.student.expectedArrivalDate),
    expectedStayDurationMonths: core.snapshot.student.expectedStayDurationMonths,
    issuedAt,
    validUntil: formatDate(core.snapshot.housing.validUntil),
    verificationUrl,
  });
  assertRenderedContent(html, input, core.snapshot);
  const pdfBuffer = await renderHousingCertificatePdfFromHtml(html);
  const pageCount = await validatePdf(pdfBuffer);
  const newChecksum = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
  const newFile = storage.file(newStoragePath);
  const [newStorageExists] = await newFile.exists();
  if (newStorageExists) fail("NEW_STORAGE_PATH_ALREADY_EXISTS");

  await newFile.save(pdfBuffer, {
    resumable: false,
    contentType: "application/pdf",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        ownerId: core.ownerId,
        caseId: input.caseId,
        housingRequestId: input.housingRequestId,
        certificateId: input.certificateId,
        certificateNumber: input.certificateReference,
        documentRevision: String(input.documentRevision),
        allocationVersion: String(input.allocationVersion),
        previousVersionId: oldVersion.id,
        revisionReason: REGENERATION_REASON,
        checksumSha256: newChecksum,
        templateVersion: TEMPLATE_VERSION,
      },
    },
    preconditionOpts: { ifGenerationMatch: 0 },
  });

  const timestamp = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const [txCertificate, txHousing, txCase, txPublic, txClient, txOldVersion, txNewVersion] =
      (await Promise.all([
        transaction.get(certificateRef),
        transaction.get(housingRequestRef),
        transaction.get(caseRef),
        transaction.get(publicDocumentRef),
        transaction.get(clientDocumentRef),
        transaction.get(oldVersionRef),
        transaction.get(newVersionRef),
      ])) as DocumentSnapshotLike[];
    const txCore = assertCorePreconditions({
      input,
      certificate: txCertificate,
      housingRequest: txHousing,
      clientCase: txCase,
      publicDocument: txPublic,
      clientDocument: txClient,
      oldVersion: txOldVersion,
    });
    if (txNewVersion.exists) fail("DOCUMENT_REVISION_CONFLICT");
    if (
      txCore.oldStoragePath !== core.oldStoragePath ||
      txCore.oldChecksum !== core.oldChecksum
    ) {
      fail("CURRENT_DOCUMENT_CHANGED_DURING_RENDER");
    }

    transaction.set(
      oldVersionRef,
      {
        status: "REPLACED",
        isCurrent: false,
        replacedAt: timestamp,
        replacedByVersionId: newVersionRef.id,
        replacementReason: REGENERATION_REASON,
      },
      { merge: true },
    );
    transaction.set(newVersionRef, {
      certificateId: input.certificateId,
      documentId: input.certificateId,
      ownerId: core.ownerId,
      caseId: input.caseId,
      housingRequestId: input.housingRequestId,
      paymentId: core.snapshot.paymentId,
      version: input.documentRevision,
      documentRevision: input.documentRevision,
      allocationVersion: input.allocationVersion,
      templateVersion: TEMPLATE_VERSION,
      checksumSha256: newChecksum,
      storagePath: newStoragePath,
      status: "ACTIVE",
      isCurrent: true,
      previousVersionId: oldVersionRef.id,
      revisionReason: REGENERATION_REASON,
      createdAt: timestamp,
      createdBy: input.actorId,
    });
    const currentPointerUpdate = {
      storagePath: newStoragePath,
      checksumSha256: newChecksum,
      size: pdfBuffer.byteLength,
      templateVersion: TEMPLATE_VERSION,
      currentDocumentVersionId: newVersionRef.id,
      documentRevision: input.documentRevision,
      previousDocumentVersionId: oldVersionRef.id,
      revisionReason: REGENERATION_REASON,
      regeneratedAt: timestamp,
      regeneratedBy: input.actorId,
      updatedAt: timestamp,
    };
    transaction.set(certificateRef, currentPointerUpdate, { merge: true });
    transaction.set(publicDocumentRef, currentPointerUpdate, { merge: true });
    transaction.set(clientDocumentRef, currentPointerUpdate, { merge: true });
    transaction.set(eventRef, {
      id: eventRef.id,
      caseId: input.caseId,
      uid: core.ownerId,
      actorType: "system",
      actorId: input.actorId,
      actorRole: "system",
      eventType: "housing_certificate_document_regenerated",
      eventLabel: "Révision PDF du certificat logement régénérée",
      eventPayload: {
        certificateId: input.certificateId,
        certificateReference: input.certificateReference,
        housingRequestId: input.housingRequestId,
        oldDocumentVersionId: oldVersionRef.id,
        newDocumentVersionId: newVersionRef.id,
        oldStoragePath: core.oldStoragePath,
        newStoragePath,
        oldChecksum: core.oldChecksum,
        newChecksum,
        allocationVersion: input.allocationVersion,
        documentRevision: input.documentRevision,
        reason: REGENERATION_REASON,
        emailSent: false,
      },
      createdAt: timestamp,
    });
  });

  const [finalCertificate, finalHousing, finalCase, finalOldVersion, finalNewVersion] =
    (await Promise.all([
      certificateRef.get(),
      housingRequestRef.get(),
      caseRef.get(),
      oldVersionRef.get(),
      newVersionRef.get(),
    ])) as DocumentSnapshotLike[];
  if (
    finalCertificate.get("storagePath") !== newStoragePath ||
    finalCertificate.get("checksumSha256") !== newChecksum ||
    finalOldVersion.get("status") !== "REPLACED" ||
    finalNewVersion.get("status") !== "ACTIVE" ||
    finalNewVersion.get("isCurrent") !== true ||
    finalHousing.get("status") !== "certificate_delivered" ||
    (finalHousing.get("allocation") as Record<string, unknown> | undefined)?.allocationVersion !==
      input.allocationVersion
  ) {
    fail("POST_COMMIT_VERIFICATION_FAILED");
  }

  return resultFromState({
    input,
    oldStoragePath: core.oldStoragePath,
    newStoragePath,
    oldChecksum: core.oldChecksum,
    newChecksum,
    caseStatus: String(finalCase.get("status") ?? "unknown"),
    housingRequestStatus: String(finalHousing.get("status") ?? "unknown"),
    pageCount,
    idempotentReplay: false,
  });
}
