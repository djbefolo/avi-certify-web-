import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => {
    throw new Error("FIRESTORE_UNAVAILABLE");
  },
}));

vi.mock("@/data/housing-inventory.bootstrap", () => ({
  HOUSING_INVENTORY: {
    generatedAt: "2026-08-04T00:00:00.000Z",
    cities: [],
  },
  canAutoIssueFromBootstrap: () => true,
  getBootstrapHousingCities: () => [],
  getBootstrapHousingResidenceById: () => null,
  getBootstrapHousingResidencesByCity: () => [],
}));

import { listAvailableHousingCities } from "@/lib/housing/housing-inventory.service";

describe("invalid housing bootstrap", () => {
  it("returns an explicit unavailable source instead of a silent empty list", async () => {
    await expect(listAvailableHousingCities()).resolves.toEqual({
      source: "unavailable",
      data: [],
    });
  });
});
