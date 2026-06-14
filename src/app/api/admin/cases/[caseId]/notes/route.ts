import { NextRequest } from "next/server";
import { withAdminOps, readAdminJson } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!note) {
      throw new Error("Internal note is required.");
    }

    const event = await getAdminOperationsStore().addCaseNote(caseId, note, actor);

    return { event };
  });
}
