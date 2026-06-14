import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function GET(request: NextRequest) {
  return withAdminOps(request, async () => {
    const { searchParams } = request.nextUrl;
    const cases = await getAdminOperationsStore().listCases({
      status: searchParams.get("status"),
      productType: searchParams.get("productType"),
      query: searchParams.get("query"),
    });

    return { cases };
  });
}
