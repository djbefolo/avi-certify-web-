import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/admin";

export type AdminDocumentVerificationStatus =
  | "REQUESTED"
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "PENDING"
  | "CORRECTION_REQUESTED";

export type AdminDocumentRecord = {
  id: string;
  uid: string;
  caseId: string | null;
  documentType: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  size: number | null;
  uploadStatus: string;
  verificationStatus: AdminDocumentVerificationStatus;
  rejectionReason: string | null;
  uploadedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export class AdminDocumentServiceError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

type DocumentSnapshots = {
  publicData: DocumentData | undefined;
  operationsData: DocumentData | undefined;
};

const verificationStatuses = new Set<AdminDocumentVerificationStatus>([
  "REQUESTED",
  "UPLOADED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "PENDING",
  "CORRECTION_REQUESTED",
]);

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDate(value: unknown) {
  if (typeof value === "string") return value;

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function normalizeVerificationStatus(
  publicData: DocumentData | undefined,
  operationsData: DocumentData | undefined,
): AdminDocumentVerificationStatus {
  const explicitStatus =
    stringValue(operationsData?.verificationStatus) ??
    stringValue(publicData?.verificationStatus);

  if (
    explicitStatus &&
    verificationStatuses.has(
      explicitStatus.toUpperCase() as AdminDocumentVerificationStatus,
    )
  ) {
    return explicitStatus.toUpperCase() as AdminDocumentVerificationStatus;
  }

  const status = (
    stringValue(publicData?.status) ??
    stringValue(operationsData?.uploadStatus) ??
    "pending"
  ).toLowerCase();
  const statusMap: Record<string, AdminDocumentVerificationStatus> = {
    requested: "REQUESTED",
    uploaded: "UPLOADED",
    under_review: "UNDER_REVIEW",
    approved: "APPROVED",
    validated: "APPROVED",
    rejected: "REJECTED",
    expired: "EXPIRED",
    correction_requested: "CORRECTION_REQUESTED",
  };

  return statusMap[status] ?? "PENDING";
}

function assertConsistentValue(
  publicValue: string | null,
  operationsValue: string | null,
  label: string,
) {
  if (publicValue && operationsValue && publicValue !== operationsValue) {
    throw new AdminDocumentServiceError(
      409,
      `Document ${label} metadata mismatch.`,
    );
  }
}

function mapDocumentRecord(
  documentId: string,
  { publicData, operationsData }: DocumentSnapshots,
): AdminDocumentRecord {
  if (!publicData && !operationsData) {
    throw new AdminDocumentServiceError(404, "Document not found.");
  }

  const publicUid =
    stringValue(publicData?.ownerId) ?? stringValue(publicData?.uid);
  const operationsUid = stringValue(operationsData?.uid);
  const publicCaseId = stringValue(publicData?.caseId);
  const operationsCaseId = stringValue(operationsData?.caseId);
  const publicStoragePath = stringValue(publicData?.storagePath);
  const operationsStoragePath = stringValue(operationsData?.storagePath);

  assertConsistentValue(publicUid, operationsUid, "owner");
  assertConsistentValue(publicCaseId, operationsCaseId, "case");
  assertConsistentValue(
    publicStoragePath,
    operationsStoragePath,
    "storage path",
  );

  const uid = operationsUid ?? publicUid;
  if (!uid) {
    throw new AdminDocumentServiceError(
      409,
      "Document owner metadata is missing.",
    );
  }

  return {
    id: documentId,
    uid,
    caseId: operationsCaseId ?? publicCaseId,
    documentType:
      stringValue(operationsData?.documentType) ??
      stringValue(publicData?.documentType) ??
      "other",
    fileName:
      stringValue(operationsData?.fileName) ??
      stringValue(publicData?.originalFileName) ??
      stringValue(publicData?.safeFileName) ??
      documentId,
    storagePath: operationsStoragePath ?? publicStoragePath ?? "",
    mimeType:
      stringValue(operationsData?.mimeType) ??
      stringValue(publicData?.contentType),
    size:
      numberValue(operationsData?.size) ?? numberValue(publicData?.size),
    uploadStatus:
      stringValue(operationsData?.uploadStatus) ??
      stringValue(publicData?.status) ??
      "pending",
    verificationStatus: normalizeVerificationStatus(
      publicData,
      operationsData,
    ),
    rejectionReason:
      stringValue(operationsData?.rejectionReason) ??
      stringValue(publicData?.rejectionReason),
    uploadedAt:
      isoDate(operationsData?.uploadedAt) ?? isoDate(publicData?.uploadedAt),
    verifiedAt:
      isoDate(operationsData?.verifiedAt) ?? isoDate(publicData?.verifiedAt),
    verifiedBy:
      stringValue(operationsData?.verifiedBy) ??
      stringValue(publicData?.verifiedBy),
  };
}

function assertTransition(
  currentStatus: AdminDocumentVerificationStatus,
  nextStatus: AdminDocumentVerificationStatus,
  rejectionReason?: string,
) {
  const allowedCurrentStatuses: Partial<
    Record<
      AdminDocumentVerificationStatus,
      AdminDocumentVerificationStatus[]
    >
  > = {
    APPROVED: ["UPLOADED", "UNDER_REVIEW"],
    REJECTED: ["UPLOADED", "UNDER_REVIEW"],
    UNDER_REVIEW: ["UPLOADED", "PENDING"],
    CORRECTION_REQUESTED: ["UNDER_REVIEW"],
  };

  if (!allowedCurrentStatuses[nextStatus]?.includes(currentStatus)) {
    throw new AdminDocumentServiceError(
      409,
      "Invalid document verification transition.",
    );
  }

  if (
    (nextStatus === "REJECTED" ||
      nextStatus === "CORRECTION_REQUESTED") &&
    !rejectionReason?.trim()
  ) {
    throw new AdminDocumentServiceError(
      400,
      nextStatus === "REJECTED"
        ? "A rejection reason is required."
        : "A correction reason is required.",
    );
  }
}

function publicStatusFor(status: AdminDocumentVerificationStatus) {
  const statuses: Partial<Record<AdminDocumentVerificationStatus, string>> = {
    APPROVED: "approved",
    REJECTED: "rejected",
    UNDER_REVIEW: "under_review",
    CORRECTION_REQUESTED: "correction_requested",
  };

  return statuses[status] ?? status.toLowerCase();
}

export async function getAdminDocumentById(documentId: string) {
  const db = getAdminFirestore();
  const publicRef = db.collection("documents").doc(documentId);
  const operationsRef = db.collection("client_documents").doc(documentId);
  const [publicSnapshot, operationsSnapshot] = await Promise.all([
    publicRef.get(),
    operationsRef.get(),
  ]);

  const document = mapDocumentRecord(documentId, {
    publicData: publicSnapshot.exists ? publicSnapshot.data() : undefined,
    operationsData: operationsSnapshot.exists
      ? operationsSnapshot.data()
      : undefined,
  });

  if (document.caseId) {
    const caseSnapshot = await db
      .collection("client_cases")
      .doc(document.caseId)
      .get();
    const caseData = caseSnapshot.data();
    const caseOwner =
      stringValue(caseData?.uid) ?? stringValue(caseData?.userId);

    if (!caseSnapshot.exists || !caseOwner || caseOwner !== document.uid) {
      throw new AdminDocumentServiceError(
        409,
        "Document case ownership metadata is inconsistent.",
      );
    }
  }

  return document;
}

export async function transitionAdminDocument(
  documentId: string,
  input: {
    verificationStatus: AdminDocumentVerificationStatus;
    rejectionReason?: string;
  },
  actor: AdminActor,
) {
  const db = getAdminFirestore();
  const publicRef = db.collection("documents").doc(documentId);
  const operationsRef = db.collection("client_documents").doc(documentId);
  const eventRef = db.collection("admin_case_events").doc();
  const now = new Date().toISOString();

  return db.runTransaction(async (transaction) => {
    const publicSnapshot = await transaction.get(publicRef);
    const operationsSnapshot = await transaction.get(operationsRef);
    const currentDocument = mapDocumentRecord(documentId, {
      publicData: publicSnapshot.exists ? publicSnapshot.data() : undefined,
      operationsData: operationsSnapshot.exists
        ? operationsSnapshot.data()
        : undefined,
    });
    const rejectionReason = input.rejectionReason?.trim() || null;

    assertTransition(
      currentDocument.verificationStatus,
      input.verificationStatus,
      rejectionReason ?? undefined,
    );

    const publicStatus = publicStatusFor(input.verificationStatus);
    const uploadStatus =
      input.verificationStatus === "APPROVED" ||
      input.verificationStatus === "REJECTED"
        ? publicStatus
        : currentDocument.uploadStatus;

    transaction.set(
      publicRef,
      {
        status: publicStatus,
        uploadStatus,
        verificationStatus: input.verificationStatus,
        rejectionReason,
        adminComment: rejectionReason,
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      operationsRef,
      {
        uid: currentDocument.uid,
        caseId: currentDocument.caseId,
        documentType: currentDocument.documentType,
        fileName: currentDocument.fileName,
        storagePath: currentDocument.storagePath,
        mimeType: currentDocument.mimeType,
        size: currentDocument.size,
        uploadStatus,
        verificationStatus: input.verificationStatus,
        rejectionReason,
        verifiedAt: now,
        verifiedBy: actor.uid,
      },
      { merge: true },
    );
    transaction.set(eventRef, {
      id: eventRef.id,
      caseId: currentDocument.caseId,
      uid: currentDocument.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "document_verified",
      eventLabel: `Document ${input.verificationStatus.toLowerCase()}`,
      eventPayload: {
        documentId,
        verificationStatus: input.verificationStatus,
        rejectionReason,
      },
      createdAt: now,
    });

    return {
      ...currentDocument,
      uploadStatus,
      verificationStatus: input.verificationStatus,
      rejectionReason,
      verifiedAt: now,
      verifiedBy: actor.uid,
    };
  });
}
