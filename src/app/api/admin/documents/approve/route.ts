import { NextRequest, NextResponse } from "next/server";
import { adminOpsHeaders, readAdminJson } from "@/app/api/admin/_utils";
import {
  DocumentSecurityError,
  documentSecurityErrorResponse,
  getAdminDocumentRecord,
  validateAdminDocumentFile,
} from "@/app/api/admin/documents/[documentId]/_file";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    const body = await readAdminJson(request);
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId) {
      throw new DocumentSecurityError(400, "Missing document id.");
    }

    const currentDocument = await getAdminDocumentRecord(documentId);
    if (currentDocument.verificationStatus === "APPROVED") {
      await validateAdminDocumentFile(currentDocument);
      return NextResponse.json(
        {
          document: {
            id: currentDocument.id,
            verificationStatus: currentDocument.verificationStatus,
          },
          alreadyApproved: true,
        },
        { headers: adminOpsHeaders },
      );
    }

    if (
      currentDocument.verificationStatus !== "UPLOADED" &&
      currentDocument.verificationStatus !== "UNDER_REVIEW"
    ) {
      throw new DocumentSecurityError(
        409,
        "Only uploaded or under-review documents can be approved.",
      );
    }

    await validateAdminDocumentFile(currentDocument);

    const document = await getAdminOperationsStore().verifyDocument(
      documentId,
      { verificationStatus: "APPROVED" },
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
