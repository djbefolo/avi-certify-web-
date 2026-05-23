import { NextRequest } from "next/server";
import { withAdmin } from "@/app/api/admin/fintech/_utils";
import { getFintechStore } from "@/lib/fintech/fintech-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    auditEvents: await getFintechStore().listAuditEvents(),
  }));
}
