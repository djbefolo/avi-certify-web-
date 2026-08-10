import { describe, expect, it } from "vitest";
import { evaluateHousingAutoIssuance } from "@/lib/housing/housing-auto-issuance-policy.service";
import type { HousingInventoryItem } from "@/types/housing";

function inventory(
  overrides: Partial<HousingInventoryItem> = {},
): HousingInventoryItem {
  return {
    id: "housing-1",
    internalReference: "AVI-LOG-FR-0001",
    partner: { displayName: "SafeHouse", operatorName: "Nemea" },
    residenceName: "Aix Campus 1",
    countryCode: "FR",
    countryName: "France",
    cityCode: "aix-en-provence",
    cityLabel: "Aix-en-Provence",
    municipality: "Aix-en-Provence",
    postalCode: "13090",
    address: {
      line1: "6 rue Jean Andreani",
      postalCode: "13090",
      city: "Aix-en-Provence",
      country: "France",
      formattedAddress: "6 rue Jean Andreani, 13090 Aix-en-Provence",
    },
    accommodationTypes: ["studio", "t1_bis"],
    pricing: {
      currency: "EUR",
      monthlyRentForCertificate: 627,
      priceValidationStatus: "verified",
    },
    inventoryStatus: "conditionally_available",
    availabilityGuaranteed: false,
    autoIssuance: {
      enabled: true,
      eligibilityStatus: "eligible",
      validUntil: "2027-01-01T00:00:00.000Z",
      conditionalCapacity: 10,
      remainingConditionalCapacity: 4,
      arrivalDateFrom: "2026-08-01T00:00:00.000Z",
      arrivalDateUntil: "2026-12-31T23:59:59.999Z",
      manualReviewRequired: false,
    },
    availability: {},
    isVisibleToClients: true,
    isEligibleForCertificate: true,
    source: {},
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const baseInput = {
  inventory: inventory(),
  expectedArrivalDate: "2026-09-01",
  requestComplete: true,
  paymentConfirmed: true,
  duplicateOrFraudRisk: false,
  globalKillSwitchEnabled: true,
  evaluatedAt: "2026-08-03T12:00:00.000Z",
};

describe("housing automatic issuance policy", () => {
  it("allows an explicitly prevalidated residence", () => {
    expect(evaluateHousingAutoIssuance(baseInput)).toMatchObject({
      eligible: true,
      reasons: ["ELIGIBLE"],
    });
  });

  it.each([
    ["kill switch", { globalKillSwitchEnabled: false }, "GLOBAL_KILL_SWITCH_DISABLED"],
    ["payment", { paymentConfirmed: false }, "PAYMENT_NOT_CONFIRMED"],
    ["request", { requestComplete: false }, "REQUEST_INCOMPLETE"],
    ["risk", { duplicateOrFraudRisk: true }, "DUPLICATE_OR_FRAUD_RISK"],
    ["arrival", { expectedArrivalDate: "2027-03-01" }, "ARRIVAL_DATE_OUT_OF_RANGE"],
  ])("fails closed for %s", (_label, overrides, reason) => {
    const decision = evaluateHousingAutoIssuance({ ...baseInput, ...overrides });
    expect(decision.eligible).toBe(false);
    expect(decision.reasons).toContain(reason);
  });

  it("rejects expired, unverified, exhausted, and manual-only inventory", () => {
    const item = inventory({
      pricing: { currency: "EUR", priceValidationStatus: "unverified" },
      autoIssuance: {
        enabled: true,
        eligibilityStatus: "eligible",
        validUntil: "2026-08-01T00:00:00.000Z",
        conditionalCapacity: 2,
        remainingConditionalCapacity: 0,
        arrivalDateFrom: "2026-08-01T00:00:00.000Z",
        arrivalDateUntil: "2026-12-31T00:00:00.000Z",
        manualReviewRequired: true,
      },
    });
    const decision = evaluateHousingAutoIssuance({ ...baseInput, inventory: item });
    expect(decision.reasons).toEqual(
      expect.arrayContaining([
        "VALIDATION_EXPIRED",
        "PRICE_NOT_VERIFIED",
        "CAPACITY_EXHAUSTED",
        "MANUAL_REVIEW_FORCED",
      ]),
    );
  });

  it("fails closed when versioned pricing is internally inconsistent", () => {
    const item = inventory({
      pricing: {
        currency: "EUR",
        residenceDisplayedRent: 610,
        partnerMonthlyRent: 610,
        discountBasisPoints: 1_000,
        clientMonthlyRent: 610,
        monthlyRentForCertificate: 549,
        pricingVersion: "partner-discount-v1",
        priceValidationStatus: "verified",
      },
    });

    const decision = evaluateHousingAutoIssuance({ ...baseInput, inventory: item });
    expect(decision.priceVerified).toBe(false);
    expect(decision.reasons).toContain("PRICE_NOT_VERIFIED");
  });
});
