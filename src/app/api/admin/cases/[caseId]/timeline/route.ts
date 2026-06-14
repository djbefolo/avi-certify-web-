import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async () => {
    const { caseId } = await params;
    const events = (await getAdminOperationsStore().listEvents()).filter(
      (event) => event.caseId === caseId,
    );

    return { events };
  });
}
