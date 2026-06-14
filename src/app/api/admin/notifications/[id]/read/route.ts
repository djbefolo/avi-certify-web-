import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdminOps(request, async () => {
    const { id } = await params;
    const notification = await getAdminOperationsStore().markNotificationRead(id);

    return { notification };
  });
}
