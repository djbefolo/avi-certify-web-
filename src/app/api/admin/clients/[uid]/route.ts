import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> },
) {
  return withAdminOps(request, async () => {
    const { uid } = await params;
    const client = await getAdminOperationsStore().getClient360(uid);

    return { client };
  });
}
