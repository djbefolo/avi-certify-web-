import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getAdminStorage } from "@/lib/firebase/admin";
import {
  isAcceptedDocumentMimeType,
  maxDocumentFileSize,
} from "@/lib/validations/document";
import type { ClientDocument } from "@/types/admin-ops";

const downloadableStatuses = new Set([
  "UPLOADED",
  "UNDER_REVIEW",
  "APPROVED",
]);

type DocumentStorageMetadata = {
  contentType?: string;
  size?: string | number;
  metadata?: Record<
    string,
    string | number | boolean | null | undefined
  >;
};

export class DocumentSecurityError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409 | 415,
    message: string,
  ) {
    super(message);
  }
}

export function documentSecurityErrorResponse(error: unknown) {
  if (error instanceof DocumentSecurityError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return adminErrorResponse(error);
}

export async function getAdminDocumentRecord(documentId: string) {
  const document = (await getAdminOperationsStore().listDocuments()).find(
    (item) => item.id === documentId,
  );

  if (!document) {
    throw new DocumentSecurityError(404, "Document not found.");
  }

  return document;
}

export async function validateAdminDocumentFile(document: ClientDocument) {
  if (!document.storagePath) {
    throw new DocumentSecurityError(
      409,
      "No uploaded file is available for this document.",
    );
  }

  const expectedPrefix = `users/${document.uid}/documents/${document.id}-`;
  if (!document.storagePath.startsWith(expectedPrefix)) {
    throw new DocumentSecurityError(
      409,
      "Document storage metadata mismatch.",
    );
  }

  if (
    document.mimeType &&
    !isAcceptedDocumentMimeType(document.mimeType)
  ) {
    throw new DocumentSecurityError(
      415,
      "Document metadata contains an unsupported MIME type.",
    );
  }

  const file = getAdminStorage().bucket().file(document.storagePath);
  let metadata: DocumentStorageMetadata;

  try {
    [metadata] = await file.getMetadata();
  } catch {
    throw new DocumentSecurityError(
      404,
      "Document file does not exist in secure storage.",
    );
  }

  const actualContentType = metadata.contentType;
  const actualSize = Number(metadata.size);
  const customMetadata = metadata.metadata ?? {};

  if (
    !isAcceptedDocumentMimeType(actualContentType) ||
    (document.mimeType && document.mimeType !== actualContentType)
  ) {
    throw new DocumentSecurityError(
      415,
      "Stored document MIME type is unsupported or inconsistent.",
    );
  }

  if (
    !Number.isInteger(actualSize) ||
    actualSize <= 0 ||
    actualSize > maxDocumentFileSize ||
    (typeof document.size === "number" &&
      document.size > 0 &&
      document.size !== actualSize)
  ) {
    throw new DocumentSecurityError(
      409,
      "Stored document size is invalid or inconsistent.",
    );
  }

  if (
    (customMetadata.ownerId &&
      customMetadata.ownerId !== document.uid) ||
    (customMetadata.documentId &&
      customMetadata.documentId !== document.id)
  ) {
    throw new DocumentSecurityError(
      409,
      "Stored document ownership metadata is inconsistent.",
    );
  }

  return { file, metadata, actualContentType, actualSize };
}

export async function serveAdminDocumentFile(
  request: NextRequest,
  documentId: string,
) {
  try {
    await requireAdmin(request);
    const document = await getAdminDocumentRecord(documentId);

    if (!downloadableStatuses.has(document.verificationStatus)) {
      throw new DocumentSecurityError(
        409,
        "Document status does not allow file access.",
      );
    }

    const { file, actualContentType } =
      await validateAdminDocumentFile(document);
    const [buffer] = await file.download();
    const fileName = document.fileName || `${document.documentType}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": actualContentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return documentSecurityErrorResponse(error);
  }
}
