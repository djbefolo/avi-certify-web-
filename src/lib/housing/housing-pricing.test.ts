import { describe, expect, it } from "vitest";
import {
  HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
  buildHousingClientPricing,
  resolveHousingClientRent,
  resolveHousingSnapshotRent,
} from "@/lib/housing/housing-pricing";

describe("housing partner discount pricing", () => {
  it.each([
    [610, 500, 579.5],
    [610, 1_000, 549],
    [610, 1_500, 518.5],
    [575, 1_000, 517.5],
  ])(
    "applies %s EUR with %s basis points as %s EUR",
    (partner, discountBasisPoints, client) => {
      expect(resolveHousingClientRent(partner, discountBasisPoints)).toBe(client);
    },
  );

  it("uses the single configured discount when building new pricing", () => {
    expect(HOUSING_PARTNER_DISCOUNT_BASIS_POINTS).toBe(1_000);
    expect(buildHousingClientPricing(610)).toEqual({
      partnerMonthlyRent: 610,
      discountBasisPoints: 1_000,
      clientMonthlyRent: 549,
      monthlyRentForCertificate: 549,
    });
  });

  it("keeps a historical snapshot unchanged", () => {
    expect(
      resolveHousingSnapshotRent({
        monthlyRentForCertificate: 610,
      }),
    ).toBe(610);
  });

  it("reads the frozen client rent from a new snapshot without recalculating it", () => {
    expect(
      resolveHousingSnapshotRent({
        partnerMonthlyRent: 610,
        discountBasisPoints: 1_000,
        clientMonthlyRent: 549,
        monthlyRentForCertificate: 549,
      }),
    ).toBe(549);
  });
});
