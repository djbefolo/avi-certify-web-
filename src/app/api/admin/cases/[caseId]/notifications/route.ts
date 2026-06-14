import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const channel = "internal";
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Notification dossier";
    const message =
      typeof body.body === "string" && body.body.trim()
        ? body.body.trim()
        : "Action admin enregistrée.";

    const result = await getAdminOperationsStore().createCaseNotification(
      caseId,
      { channel, title, body: message },
      actor,
    );

    return result;
  });
}
