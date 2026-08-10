import { describe, expect, it } from "vitest";
import { planHousingPartnerDiscountMigration } from "@/lib/housing/housing-pricing-migration";

describe("housing partner discount migration", () => {
  it("preserves the partner price and creates the versioned client price", () => {
    const plan = planHousingPartnerDiscountMigration("AVI-LOG-FR-0032", {
      currency: "EUR",
      residenceDisplayedRent: 610,
      monthlyRentForCertificate: 610,
      priceValidationStatus: "requires_admin_review",
    });

    expect(plan).toMatchObject({
      status: "migrate",
      partnerMonthlyRent: 610,
      discountBasisPoints: 1_000,
      clientMonthlyRent: 549,
      pricingVersion: "partner-discount-v1",
      nextPricing: {
        residenceDisplayedRent: 610,
        partnerMonthlyRent: 610,
        clientMonthlyRent: 549,
        monthlyRentForCertificate: 549,
      },
    });
  });

  it("is idempotent after the first migration", () => {
    const first = planHousingPartnerDiscountMigration("AVI-LOG-FR-0032", {
      currency: "EUR",
      residenceDisplayedRent: 610,
      monthlyRentForCertificate: 610,
    });
    expect(first.status).toBe("migrate");
    if (first.status !== "migrate") throw new Error("expected migration plan");

    expect(
      planHousingPartnerDiscountMigration("AVI-LOG-FR-0032", first.nextPricing),
    ).toMatchObject({
      status: "unchanged",
      partnerMonthlyRent: 610,
      clientMonthlyRent: 549,
    });
  });

  it("blocks ambiguous legacy reference prices", () => {
    expect(
      planHousingPartnerDiscountMigration("ambiguous", {
        residenceDisplayedRent: 610,
        monthlyRentForCertificate: 600,
      }),
    ).toEqual({
      status: "anomaly",
      inventoryId: "ambiguous",
      code: "LEGACY_REFERENCE_PRICES_DIFFER",
    });
  });
});
