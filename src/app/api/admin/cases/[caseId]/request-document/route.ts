import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { documentTypeValues } from "@/lib/validations/document";

const allowedDocumentTypes = new Set<string>(documentTypeValues);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const documentType =
      typeof body.documentType === "string" ? body.documentType : "";

    if (!allowedDocumentTypes.has(documentType)) {
      throw new Error("Invalid document request type.");
    }

    const result = await getAdminOperationsStore().requestDocument(
      caseId,
      {
        documentType,
        message: typeof body.message === "string" ? body.message : undefined,
      },
      actor,
    );

    return result;
  });
}
