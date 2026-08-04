import { NextRequest, NextResponse } from "next/server";
import {
  housingClientErrorResponse,
  requireVerifiedHousingClient,
} from "@/app/api/client/housing/_auth";
import { listPublicHousingCities } from "@/lib/housing/housing-inventory.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireVerifiedHousingClient(request);
    return NextResponse.json(
      { cities: await listPublicHousingCities() },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return housingClientErrorResponse(error);
  }
}
