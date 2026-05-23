import { NextRequest } from "next/server";
import { financialProducts } from "@/lib/fintech/workbook-defaults";
import { withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    products: financialProducts,
  }));
}
