import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { listHousingInventoryForAdmin } from "@/lib/housing/housing-inventory.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return NextResponse.json(
      {
        inventory: await listHousingInventoryForAdmin(),
        autoIssuanceGloballyEnabled:
          process.env.HOUSING_AUTO_ISSUANCE_ENABLED === "true",
      },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
