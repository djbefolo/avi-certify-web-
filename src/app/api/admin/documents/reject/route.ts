import { NextRequest, NextResponse } from "next/server";
import { adminOpsHeaders, readAdminJson } from "@/app/api/admin/_utils";
import {
  DocumentSecurityError,
  documentSecurityErrorResponse,
  getAdminDocumentRecord,
} from "@/app/api/admin/documents/[documentId]/_file";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = await readAdminJson(request);
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    const rejectionReason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";
    if (!documentId) {
      throw new DocumentSecurityError(400, "Missing document id.");
    }
    if (!rejectionReason) {
      throw new DocumentSecurityError(
        400,
        "A rejection reason is required.",
      );
    }

    const currentDocument = await getAdminDocumentRecord(documentId);
    if (
      currentDocument.verificationStatus !== "UPLOADED" &&
      currentDocument.verificationStatus !== "UNDER_REVIEW"
    ) {
      throw new DocumentSecurityError(
        409,
        "Only uploaded or under-review documents can be rejected.",
      );
    }

    const document = await getAdminOperationsStore().verifyDocument(
      documentId,
      { verificationStatus: "REJECTED", rejectionReason },
      actor,
    );

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
