import { describe, expect, it } from "vitest";
import {
  HOUSING_INVENTORY,
  canAutoIssueFromBootstrap,
  getBootstrapHousingCities,
  getBootstrapHousingResidenceById,
} from "@/data/housing-inventory.bootstrap";

describe("housing inventory bootstrap", () => {
  const residences = HOUSING_INVENTORY.cities.flatMap((city) => city.residences);

  it("contains the audited 21 cities and 42 unique residences", () => {
    expect(getBootstrapHousingCities()).toHaveLength(21);
    expect(residences).toHaveLength(42);
    expect(new Set(residences.map((item) => item.id)).size).toBe(42);
    expect(HOUSING_INVENTORY.summary).toMatchObject({
      residenceCount: 42,
      cityZoneCount: 21,
      municipalityCount: 28,
    });
  });

  it("forbids automatic issuance for every residence", () => {
    expect(canAutoIssueFromBootstrap()).toBe(false);
    for (const residence of residences) {
      expect(residence.autoIssuance.enabled).toBe(false);
      expect(residence.autoIssuance.eligibilityStatus).toBe("manual_review_only");
      expect(residence.autoIssuance.manualReviewRequired).toBe(true);
      expect(residence.manualReviewRequired).toBe(true);
    }
  });

  it("keeps exact addresses hidden until explicitly validated", () => {
    expect(residences.every((item) => item.publicAddress.displayToClient === false)).toBe(
      true,
    );
  });

  it("resolves a residence only by its server identifier", () => {
    expect(getBootstrapHousingResidenceById("AVI-LOG-FR-0001")).toMatchObject({
      residenceName: "Aix Campus 1",
      cityCode: "AIX_EN_PROVENCE",
    });
    expect(getBootstrapHousingResidenceById("unknown")).toBeNull();
  });
});
