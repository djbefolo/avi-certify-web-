import { NextRequest, NextResponse } from "next/server";
import {
  adminDocumentHeaders,
  DocumentSecurityError,
  documentSecurityErrorResponse,
  getAdminDocumentRecord,
  readAdminDocumentJson,
} from "@/app/api/admin/documents/[documentId]/_file";
import { requireAdmin } from "@/lib/admin/admin-auth";
import {
  transitionAdminDocument,
  type AdminDocumentVerificationStatus,
} from "@/lib/documents/admin-document.service";

const allowedStatuses: AdminDocumentVerificationStatus[] = [
  "UNDER_REVIEW",
  "CORRECTION_REQUESTED",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { documentId } = await params;
    const body = await readAdminDocumentJson(request);
    const verificationStatus =
      body.verificationStatus as AdminDocumentVerificationStatus;
    const rejectionReason =
      typeof body.rejectionReason === "string"
        ? body.rejectionReason.trim()
        : "";

    if (!allowedStatuses.includes(verificationStatus)) {
      throw new DocumentSecurityError(
        400,
        "Use the dedicated approve or reject route for final decisions.",
      );
    }

    const currentDocument = await getAdminDocumentRecord(documentId);
    const allowedTransition =
      (verificationStatus === "UNDER_REVIEW" &&
        ["UPLOADED", "PENDING"].includes(
          currentDocument.verificationStatus,
        )) ||
      (verificationStatus === "CORRECTION_REQUESTED" &&
        currentDocument.verificationStatus === "UNDER_REVIEW");

    if (!allowedTransition) {
      throw new DocumentSecurityError(
        409,
        "Invalid document verification transition.",
      );
    }

    if (
      verificationStatus === "CORRECTION_REQUESTED" &&
      !rejectionReason
    ) {
      throw new DocumentSecurityError(
        400,
        "A correction reason is required.",
      );
    }

    const document = await transitionAdminDocument(
      documentId,
      {
        verificationStatus,
        rejectionReason:
          rejectionReason || undefined,
      },
      actor,
    );

    return NextResponse.json(
      {
        document: {
          id: document.id,
          verificationStatus: document.verificationStatus,
        },
      },
      { headers: adminDocumentHeaders },
    );
  } catch (error) {
    return documentSecurityErrorResponse(error);
  }
}
