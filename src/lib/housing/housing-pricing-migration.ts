import {
  HOUSING_PARTNER_DISCOUNT_PRICING_VERSION,
  buildPartnerDiscountHousingPricing,
  resolveHousingClientPricing,
  sameHousingMoneyAmount,
} from "./housing-pricing.ts";

type PricingRecord = Record<string, unknown>;

export type HousingPricingMigrationPlan =
  | {
      status: "migrate";
      inventoryId: string;
      partnerMonthlyRent: number;
      clientMonthlyRent: number;
      discountBasisPoints: number;
      pricingVersion: typeof HOUSING_PARTNER_DISCOUNT_PRICING_VERSION;
      nextPricing: PricingRecord;
    }
  | {
      status: "unchanged";
      inventoryId: string;
      partnerMonthlyRent: number;
      clientMonthlyRent: number;
      discountBasisPoints: number;
      pricingVersion: typeof HOUSING_PARTNER_DISCOUNT_PRICING_VERSION;
    }
  | {
      status: "anomaly";
      inventoryId: string;
      code: string;
    };

function positiveMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function planHousingPartnerDiscountMigration(
  inventoryId: string,
  pricing: PricingRecord,
): HousingPricingMigrationPlan {
  try {
    if (pricing.pricingVersion === HOUSING_PARTNER_DISCOUNT_PRICING_VERSION) {
      const resolved = resolveHousingClientPricing(pricing);
      if (!resolved || resolved.mode !== "partner_discount" || !resolved.partnerMonthlyRent) {
        return { status: "anomaly", inventoryId, code: "VERSIONED_PRICING_INVALID" };
      }
      return {
        status: "unchanged",
        inventoryId,
        partnerMonthlyRent: resolved.partnerMonthlyRent,
        clientMonthlyRent: resolved.clientMonthlyRent,
        discountBasisPoints: resolved.discountBasisPoints as number,
        pricingVersion: HOUSING_PARTNER_DISCOUNT_PRICING_VERSION,
      };
    }

    if (pricing.pricingVersion) {
      return { status: "anomaly", inventoryId, code: "PRICING_VERSION_UNSUPPORTED" };
    }

    const certificateRent = positiveMoney(pricing.monthlyRentForCertificate);
    const displayedRent = positiveMoney(pricing.residenceDisplayedRent);
    if (
      certificateRent !== null &&
      displayedRent !== null &&
      !sameHousingMoneyAmount(certificateRent, displayedRent)
    ) {
      return { status: "anomaly", inventoryId, code: "LEGACY_REFERENCE_PRICES_DIFFER" };
    }

    const partnerMonthlyRent =
      certificateRent ?? displayedRent ?? positiveMoney(pricing.cityIndicativePrice);
    if (partnerMonthlyRent === null) {
      return { status: "anomaly", inventoryId, code: "PARTNER_RENT_MISSING" };
    }

    const derived = buildPartnerDiscountHousingPricing(partnerMonthlyRent);
    return {
      status: "migrate",
      inventoryId,
      partnerMonthlyRent: derived.partnerMonthlyRent,
      clientMonthlyRent: derived.clientMonthlyRent,
      discountBasisPoints: derived.discountBasisPoints,
      pricingVersion: derived.pricingVersion,
      nextPricing: {
        ...pricing,
        ...derived,
      },
    };
  } catch (error) {
    return {
      status: "anomaly",
      inventoryId,
      code: error instanceof Error ? error.message : "PRICING_MIGRATION_INVALID",
    };
  }
}
