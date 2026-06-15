import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { documentTypeValues } from "@/lib/validations/document";

const allowedDocumentTypes = new Set<string>(documentTypeValues);

export async function POST(request: NextRequest) {
  return withAdminOps(request, async (actor) => {
    const body = await readAdminJson(request);
    const caseId = typeof body.caseId === "string" ? body.caseId : "";
    const documentTypes = Array.isArray(body.documentTypes)
      ? body.documentTypes.filter((item): item is string => typeof item === "string")
      : typeof body.documentType === "string"
        ? [body.documentType]
        : [];

    if (!caseId) throw new Error("Missing case id.");
    if (!documentTypes.length || documentTypes.some((type) => !allowedDocumentTypes.has(type))) {
      throw new Error("Invalid document request type.");
    }

    const results = [];
    for (const documentType of documentTypes) {
      results.push(
        await getAdminOperationsStore().requestDocument(
          caseId,
          {
            documentType,
            message: typeof body.message === "string" ? body.message : undefined,
          },
          actor,
        ),
      );
    }

    return { results };
  });
}
