import { NextRequest, NextResponse } from "next/server";
import { adminOpsHeaders, readAdminJson } from "@/app/api/admin/_utils";
import {
  DocumentSecurityError,
  documentSecurityErrorResponse,
  getAdminDocumentRecord,
} from "@/app/api/admin/documents/[documentId]/_file";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { ClientDocument } from "@/types/admin-ops";

const allowedStatuses: ClientDocument["verificationStatus"][] = [
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
    const body = await readAdminJson(request);
    const verificationStatus = body.verificationStatus as ClientDocument["verificationStatus"];
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

    const document = await getAdminOperationsStore().verifyDocument(
      documentId,
      {
        verificationStatus,
        rejectionReason:
          rejectionReason || undefined,
      },
      actor,
    );

    if (verificationStatus === "CORRECTION_REQUESTED") {
      await getAdminFirestore()
        .collection("documents")
        .doc(documentId)
        .set(
          {
            status: "correction_requested",
            verificationStatus: "CORRECTION_REQUESTED",
            rejectionReason,
            adminComment: rejectionReason,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
    }

    return NextResponse.json(
      {
        document: {
          id: document.id,
          verificationStatus: document.verificationStatus,
        },
      },
      { headers: adminOpsHeaders },
    );
  } catch (error) {
    return documentSecurityErrorResponse(error);
  }
}
