import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { housingAdminErrorResponse } from "@/app/api/admin/housing/_utils";
import { updateHousingInventoryGovernance } from "@/lib/housing/housing-inventory.service";
import { housingInventoryGovernanceInputSchema } from "@/lib/validations/housing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { inventoryId } = await params;
    const input = housingInventoryGovernanceInputSchema.parse(await request.json());
    const inventory = await updateHousingInventoryGovernance({
      inventoryId,
      input,
      actor,
    });
    return NextResponse.json(
      { inventory },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "HOUSING_INVENTORY_POLICY_INVALID", details: error.flatten().fieldErrors },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return housingAdminErrorResponse(error);
  }
}
