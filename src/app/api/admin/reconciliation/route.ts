import { NextRequest } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { buildHistoricalReconciliationPlan } from "@/lib/server/historical-reconciliation.service";
import { adminOpsJson } from "@/app/api/admin/_utils";

export const dynamic = "force-dynamic";

function boundedLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "25", 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 50)) : 25;
}

/** Read-only Super Admin endpoint. APPLY is deliberately not routable. */
export async function GET(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (actor.role !== "super_admin") {
      return adminOpsJson({ error: "Super admin role required." }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const plan = await buildHistoricalReconciliationPlan({
      limit: boundedLimit(searchParams.get("limit")),
      cursor: searchParams.get("cursor"),
    });
    return adminOpsJson({ plan });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
