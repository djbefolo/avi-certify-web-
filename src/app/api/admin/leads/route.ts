import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminLeadsStore } from "@/lib/admin/admin-leads-store";

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);

  return Number.isFinite(limit) ? limit : undefined;
}

export async function GET(request: NextRequest) {
  return withAdminOps(request, async () => {
    const { searchParams } = request.nextUrl;
    const result = await getAdminLeadsStore().listLeads({
      limit: parseLimit(searchParams.get("limit")),
      crmStatus: searchParams.get("crmStatus"),
      query: searchParams.get("query"),
    });

    return result;
  });
}
