import { NextRequest, NextResponse } from "next/server";
import {
  getAdminAuth,
  getAdminFirestore,
  getAdminStorage,
} from "@/lib/firebase/admin";
import { maxDocumentFileSize } from "@/lib/validations/document";

const certificateStatuses = new Set(["generated", "approved", "validated"]);
const certificateIdPattern = /^[A-Za-z0-9_-]{1,160}$/;

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

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await getAdminAuth().verifyIdToken(token, true);

  return decoded.uid;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  let uid: string;

  try {
    uid = await requireClientUid(request);
  } catch {
    return jsonError("Unauthorized", 401);
  }

  const { certificateId } = await params;

  if (!certificateIdPattern.test(certificateId)) {
    return jsonError("Invalid certificate id.", 400);
  }

  const snapshot = await getAdminFirestore()
    .collection("documents")
    .doc(certificateId)
    .get();
  const data = snapshot.data();

  if (
    !snapshot.exists ||
    !data ||
    String(data.ownerId ?? data.uid ?? "") !== uid ||
    data.documentType !== "accommodation_certificate"
  ) {
    return jsonError("Certificate not found.", 404);
  }

  const status = String(data.status ?? "").toLowerCase();

  if (!certificateStatuses.has(status)) {
    return jsonError("Certificate is not ready for download.", 409);
  }

  const storagePath =
    typeof data.storagePath === "string" ? data.storagePath : "";
  const expectedPrefix = `users/${uid}/documents/${certificateId}-`;

  if (!storagePath.startsWith(expectedPrefix)) {
    return jsonError("Certificate storage metadata mismatch.", 409);
  }

  const file = getAdminStorage().bucket().file(storagePath);
  let metadata: DocumentStorageMetadata;

  try {
    [metadata] = await file.getMetadata();
  } catch {
    return jsonError("Certificate file is not available.", 404);
  }

  const actualSize = Number(metadata.size);
  const customMetadata = metadata.metadata ?? {};

  if (metadata.contentType !== "application/pdf") {
    return jsonError("Certificate MIME type is invalid.", 409);
  }

  if (
    !Number.isInteger(actualSize) ||
    actualSize <= 0 ||
    actualSize > maxDocumentFileSize
  ) {
    return jsonError("Certificate size is invalid.", 409);
  }

  if (
    (customMetadata.ownerId && customMetadata.ownerId !== uid) ||
    (customMetadata.uid && customMetadata.uid !== uid) ||
    (customMetadata.documentId && customMetadata.documentId !== certificateId) ||
    (customMetadata.certificateId &&
      customMetadata.certificateId !== certificateId) ||
    (customMetadata.documentType &&
      customMetadata.documentType !== "accommodation_certificate")
  ) {
    return jsonError("Certificate ownership metadata is invalid.", 409);
  }

  const [buffer] = await file.download();
  const certificateNumber =
    typeof data.certificateNumber === "string"
      ? data.certificateNumber
      : certificateId;
  const fileName = `attestation-avi-certify-${certificateNumber}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
