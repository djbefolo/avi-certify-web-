import { NextRequest, NextResponse } from "next/server";
import {
  housingClientErrorResponse,
  requireVerifiedHousingClient,
} from "@/app/api/client/housing/_auth";
import { listAvailableHousingResidences } from "@/lib/housing/housing-inventory.service";
import { resolveHousingSnapshotRent } from "@/lib/housing/housing-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireVerifiedHousingClient(request);
    const cityCode = request.nextUrl.searchParams.get("cityCode")?.trim();
    if (!cityCode) {
      return NextResponse.json({ error: "CITY_CODE_REQUIRED" }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{2,100}$/.test(cityCode)) {
      return NextResponse.json({ error: "CITY_CODE_INVALID" }, { status: 400 });
    }
    const result = await listAvailableHousingResidences(cityCode);
    if (result.source === "unavailable") {
      throw new Error("HOUSING_INVENTORY_UNAVAILABLE");
    }
    const residences = result.data.map((item) => {
      const clientMonthlyRent =
        resolveHousingSnapshotRent(item.pricing);
      return {
      id: item.id,
      internalReference: item.internalReference,
      cityCode: item.cityCode,
      cityLabel: item.cityLabel,
      municipality: item.municipality,
      postalCode: item.postalCode,
      residenceName: item.residenceName,
      partnerName: item.partner.displayName,
      accommodationTypes: item.accommodationTypes,
      indicativeMonthlyRent: clientMonthlyRent,
      monthlyRent: clientMonthlyRent,
      cityIndicativePrice: clientMonthlyRent,
      currency: item.pricing.currency,
      availabilityStatus: item.inventoryStatus,
      availabilityLabel: "Sous réserve de disponibilité",
      processingMode:
        result.source === "bootstrap" ||
        item.autoIssuance.manualReviewRequired === true
          ? "manual_review"
          : "standard",
      publicDescription: item.publicDescription ?? null,
      publicAddress:
        item.publicAddress?.displayToClient && item.publicAddress.formattedAddress
          ? {
              formattedAddress: item.publicAddress.formattedAddress,
              displayToClient: true,
            }
          : null,
      };
    });
    return NextResponse.json(
      { source: result.source, residences },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return housingClientErrorResponse(error);
  }
}
