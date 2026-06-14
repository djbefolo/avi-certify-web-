import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function GET(request: NextRequest) {
  return withAdminOps(request, async () => {
    const notifications = await getAdminOperationsStore().listNotifications();

    return { notifications };
  });
}
