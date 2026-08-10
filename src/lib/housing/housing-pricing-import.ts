import {
  HOUSING_PARTNER_DISCOUNT_PRICING_VERSION,
  buildPartnerDiscountHousingPricing,
  resolveHousingClientPricing,
  sameHousingMoneyAmount,
} from "./housing-pricing.ts";

type PricingRecord = Record<string, unknown>;

export function buildImportedHousingPricing({
  inventoryId,
  sourcePricing,
  existingPricing,
}: {
  inventoryId: string;
  sourcePricing: PricingRecord;
  existingPricing?: PricingRecord | null;
}) {
  if (
    existingPricing?.pricingVersion &&
    existingPricing.pricingVersion !== HOUSING_PARTNER_DISCOUNT_PRICING_VERSION
  ) {
    throw new Error(`Unsupported pricing version for ${inventoryId}.`);
  }
  if (existingPricing?.pricingVersion === HOUSING_PARTNER_DISCOUNT_PRICING_VERSION) {
    resolveHousingClientPricing(existingPricing);
  }
  const partnerMonthlyRent =
    typeof sourcePricing.residenceDisplayedRent === "number"
      ? sourcePricing.residenceDisplayedRent
      : typeof sourcePricing.cityIndicativePrice === "number"
        ? sourcePricing.cityIndicativePrice
        : null;
  if (!partnerMonthlyRent) {
    throw new Error(`Missing partner rent for ${inventoryId}.`);
  }

  const derivedPricing = buildPartnerDiscountHousingPricing(partnerMonthlyRent);
  const partnerPriceChanged =
    existingPricing?.pricingVersion === HOUSING_PARTNER_DISCOUNT_PRICING_VERSION &&
    typeof existingPricing.partnerMonthlyRent === "number" &&
    !sameHousingMoneyAmount(existingPricing.partnerMonthlyRent, partnerMonthlyRent);

  return {
    currency: "EUR" as const,
    ...sourcePricing,
    ...derivedPricing,
    priceValidationStatus: partnerPriceChanged
      ? "requires_admin_review"
      : existingPricing?.priceValidationStatus ?? "unverified",
    ...(typeof existingPricing?.serviceFee === "number"
      ? { serviceFee: existingPricing.serviceFee }
      : {}),
  };
}
