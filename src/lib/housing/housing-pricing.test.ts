import { describe, expect, it } from "vitest";
import {
  HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
  buildPartnerDiscountHousingPricing,
  calculateDiscountedHousingRentCents,
  resolveHousingClientPricing,
} from "@/lib/housing/housing-pricing";

describe("housing partner discount pricing", () => {
  it.each([
    [610, 549],
    [575, 517.5],
  ])("applies the 10 percent discount to %s EUR", (partner, client) => {
    expect(buildPartnerDiscountHousingPricing(partner)).toMatchObject({
      partnerMonthlyRent: partner,
      discountBasisPoints: 1_000,
      clientMonthlyRent: client,
      monthlyRentForCertificate: client,
      pricingVersion: "partner-discount-v1",
    });
  });

  it("rounds a fractional cent half-up deterministically", () => {
    expect(
      calculateDiscountedHousingRentCents({
        partnerRentCents: 57_555,
        discountBasisPoints: HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
      }),
    ).toBe(51_800);
  });

  it("keeps legacy pricing unchanged when no pricing version is present", () => {
    expect(
      resolveHousingClientPricing({
        monthlyRentForCertificate: 610,
        residenceDisplayedRent: 610,
      }),
    ).toEqual({
      mode: "legacy",
      partnerMonthlyRent: null,
      discountBasisPoints: null,
      clientMonthlyRent: 610,
      pricingVersion: null,
    });
  });

  it("fails closed when versioned pricing fields disagree", () => {
    expect(() =>
      resolveHousingClientPricing({
        ...buildPartnerDiscountHousingPricing(610),
        clientMonthlyRent: 610,
      }),
    ).toThrow("HOUSING_PRICING_VALUES_INCONSISTENT");
  });
});
