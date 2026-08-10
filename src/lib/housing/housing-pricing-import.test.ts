import { describe, expect, it } from "vitest";
import { buildImportedHousingPricing } from "@/lib/housing/housing-pricing-import";

describe("housing inventory pricing import", () => {
  it("does not apply the discount twice when the same source is imported twice", () => {
    const sourcePricing = {
      cityIndicativePrice: 450,
      residenceDisplayedRent: 610,
    };
    const first = buildImportedHousingPricing({
      inventoryId: "AVI-LOG-FR-0032",
      sourcePricing,
      existingPricing: { priceValidationStatus: "verified", serviceFee: 99 },
    });
    const second = buildImportedHousingPricing({
      inventoryId: "AVI-LOG-FR-0032",
      sourcePricing,
      existingPricing: first,
    });

    expect(second).toEqual(first);
    expect(second).toMatchObject({
      residenceDisplayedRent: 610,
      partnerMonthlyRent: 610,
      clientMonthlyRent: 549,
      monthlyRentForCertificate: 549,
      discountBasisPoints: 1_000,
      pricingVersion: "partner-discount-v1",
    });
  });

  it("requires review when an imported partner price changes", () => {
    const pricing = buildImportedHousingPricing({
      inventoryId: "AVI-LOG-FR-0032",
      sourcePricing: { residenceDisplayedRent: 620 },
      existingPricing: buildImportedHousingPricing({
        inventoryId: "AVI-LOG-FR-0032",
        sourcePricing: { residenceDisplayedRent: 610 },
        existingPricing: { priceValidationStatus: "verified" },
      }),
    });

    expect(pricing).toMatchObject({
      partnerMonthlyRent: 620,
      clientMonthlyRent: 558,
      priceValidationStatus: "requires_admin_review",
    });
  });
});
