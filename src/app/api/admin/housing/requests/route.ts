import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { listHousingRequestsForAdmin } from "@/lib/housing/housing-request.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const caseId = request.nextUrl.searchParams.get("caseId");
    const ownerId = request.nextUrl.searchParams.get("ownerId");
    const requests = await listHousingRequestsForAdmin({ caseId, ownerId });
    return NextResponse.json(
      { requests },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
