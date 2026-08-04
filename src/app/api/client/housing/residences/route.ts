import { NextRequest, NextResponse } from "next/server";
import {
  housingClientErrorResponse,
  requireVerifiedHousingClient,
} from "@/app/api/client/housing/_auth";
import { listPublicHousingInventory } from "@/lib/housing/housing-inventory.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireVerifiedHousingClient(request);
    const cityCode = request.nextUrl.searchParams.get("cityCode")?.trim();
    if (!cityCode) {
      return NextResponse.json({ error: "CITY_CODE_REQUIRED" }, { status: 400 });
    }
    const residences = (await listPublicHousingInventory(cityCode)).map((item) => ({
      id: item.id,
      internalReference: item.internalReference,
      cityCode: item.cityCode,
      cityLabel: item.cityLabel,
      municipality: item.municipality,
      residenceName: item.residenceName,
      partnerName: item.partner.displayName,
      accommodationTypes: item.accommodationTypes,
      indicativeMonthlyRent:
        item.pricing.residenceDisplayedRent ?? item.pricing.cityIndicativePrice ?? null,
      currency: item.pricing.currency,
      availabilityStatus: item.inventoryStatus,
      publicDescription: item.publicDescription ?? null,
      publicAddress:
        item.publicAddress?.displayToClient && item.publicAddress.formattedAddress
          ? {
              formattedAddress: item.publicAddress.formattedAddress,
              displayToClient: true,
            }
          : null,
    }));
    return NextResponse.json(
      { residences },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return housingClientErrorResponse(error);
  }
}
