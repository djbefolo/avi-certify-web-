import { NextRequest, NextResponse } from "next/server";
import {
  housingClientErrorResponse,
  requireVerifiedHousingClient,
} from "@/app/api/client/housing/_auth";
import { listAvailableHousingCities } from "@/lib/housing/housing-inventory.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireVerifiedHousingClient(request);
    const result = await listAvailableHousingCities();
    if (result.source === "unavailable") {
      throw new Error("HOUSING_INVENTORY_UNAVAILABLE");
    }
    return NextResponse.json(
      { source: result.source, cities: result.data },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return housingClientErrorResponse(error);
  }
}
