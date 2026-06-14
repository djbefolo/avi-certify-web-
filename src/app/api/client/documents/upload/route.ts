import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getAdminFirestore,
  getAdminStorage,
} from "@/lib/firebase/admin";
import {
  isAcceptedDocumentMimeType,
  isSafeDocumentFileName,
  maxDocumentFileSize,
  requestedDocumentUploadSchema,
} from "@/lib/validations/document";

const editableDocumentStatuses = new Set([
  "requested",
  "rejected",
  "correction_requested",
]);

type DocumentStorageMetadata = {
  contentType?: string;
  size?: string | number;
  metadata?: Record<
    string,
    string | number | boolean | null | undefined
  >;
};

async function requireClientUid(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) throw new Error("Unauthorized");
  const decoded = await getAdminAuth().verifyIdToken(token, true);
  return decoded.uid;
}

export async function POST(request: NextRequest) {
  let uid: string;

  try {
    uid = await requireClientUid(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestedDocumentUploadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Complete and valid upload metadata is required." },
      { status: 400 },
    );
  }

  const {
    documentId,
    documentType,
    contentType,
    size,
    originalFileName,
    safeFileName,
    storagePath,
  } = parsed.data;
  const expectedStoragePath = `users/${uid}/documents/${documentId}-${safeFileName}`;

  if (
    storagePath !== expectedStoragePath ||
    !isSafeDocumentFileName(safeFileName, originalFileName, contentType)
  ) {
    return NextResponse.json(
      { error: "Unsafe filename or invalid document storage path." },
      { status: 400 },
    );
  }

  const storageFile = getAdminStorage().bucket().file(storagePath);
  let storageMetadata: DocumentStorageMetadata;

  try {
    [storageMetadata] = await storageFile.getMetadata();
  } catch {
    return NextResponse.json(
      { error: "Uploaded document file was not found in secure storage." },
      { status: 404 },
    );
  }

  const actualContentType = storageMetadata.contentType;
  const actualSize = Number(storageMetadata.size);
  const customMetadata = storageMetadata.metadata ?? {};

  if (
    !isAcceptedDocumentMimeType(actualContentType) ||
    actualContentType !== contentType
  ) {
    return NextResponse.json(
      { error: "Stored document MIME type does not match the upload." },
      { status: 409 },
    );
  }

  if (
    !Number.isInteger(actualSize) ||
    actualSize <= 0 ||
    actualSize > maxDocumentFileSize ||
    actualSize !== size
  ) {
    return NextResponse.json(
      { error: "Stored document size does not match the upload." },
      { status: 409 },
    );
  }

  if (
    (customMetadata.ownerId && customMetadata.ownerId !== uid) ||
    (customMetadata.documentId &&
      customMetadata.documentId !== documentId)
  ) {
    return NextResponse.json(
      { error: "Stored document ownership metadata is invalid." },
      { status: 409 },
    );
  }

  const db = getAdminFirestore();
  const documentRef = db.collection("documents").doc(documentId);
  const operationsRef = db.collection("client_documents").doc(documentId);
  const uploadedAt = new Date().toISOString();

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(documentRef);
      const operationsSnapshot = await transaction.get(operationsRef);
      const data = snapshot.data();

      if (!snapshot.exists || data?.ownerId !== uid) {
        throw new Error("DOCUMENT_NOT_FOUND");
      }

      const currentStatus = String(
        data.status ?? data.verificationStatus ?? "",
      ).toLowerCase();
      if (!editableDocumentStatuses.has(currentStatus)) {
        throw new Error("DOCUMENT_STATUS_LOCKED");
      }

      if (data.documentType !== documentType) {
        throw new Error("DOCUMENT_TYPE_MISMATCH");
      }

      const caseId = typeof data.caseId === "string" ? data.caseId : null;
      const operationsData = operationsSnapshot.data();
      if (
        operationsSnapshot.exists &&
        (String(operationsData?.uid ?? "") !== uid ||
          (operationsData?.caseId ?? null) !== caseId)
      ) {
        throw new Error("DOCUMENT_CASE_MISMATCH");
      }

      if (caseId) {
        const caseSnapshot = await transaction.get(
          db.collection("client_cases").doc(caseId),
        );
        const caseData = caseSnapshot.data();
        if (
          !caseSnapshot.exists ||
          String(caseData?.uid ?? caseData?.userId ?? "") !== uid
        ) {
          throw new Error("DOCUMENT_CASE_MISMATCH");
        }
      }

      transaction.set(
        documentRef,
        {
          status: "uploaded",
          uploadStatus: "uploaded",
          verificationStatus: "UPLOADED",
          originalFileName,
          safeFileName,
          contentType: actualContentType,
          size: actualSize,
          storagePath,
          uploadedBy: "CLIENT",
          source: "CLIENT",
          rejectionReason: null,
          adminComment: null,
          verifiedAt: null,
          verifiedBy: null,
          updatedAt: FieldValue.serverTimestamp(),
          uploadedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(
        operationsRef,
        {
          uid,
          caseId,
          documentType,
          fileName: originalFileName,
          storagePath,
          mimeType: actualContentType,
          size: actualSize,
          downloadUrl: null,
          uploadStatus: "uploaded",
          verificationStatus: "UPLOADED",
          uploadedBy: "CLIENT",
          source: "CLIENT",
          rejectionReason: null,
          verifiedAt: null,
          verifiedBy: null,
          uploadedAt,
        },
        { merge: true },
      );
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const responses: Record<string, [string, number]> = {
      DOCUMENT_NOT_FOUND: ["Document request not found.", 404],
      DOCUMENT_STATUS_LOCKED: [
        "Document is not awaiting a client upload.",
        409,
      ],
      DOCUMENT_TYPE_MISMATCH: [
        "Document type does not match the request.",
        409,
      ],
      DOCUMENT_CASE_MISMATCH: [
        "Document request is not linked to this client case.",
        409,
      ],
    };
    const [message, status] = responses[code] ?? [
      "Unable to secure the uploaded document.",
      500,
    ];

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, matchedRequest: true });
}
