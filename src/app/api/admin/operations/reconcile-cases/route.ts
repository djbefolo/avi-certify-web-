import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function POST(request: NextRequest) {
  return withAdminOps(request, async (actor) => {
    const result = await getAdminOperationsStore().reconcileCases(actor);

    return { result };
  });
}
