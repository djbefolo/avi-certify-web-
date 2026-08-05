import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  let failure: Error | null = null;

  function snapshot(id: string, value?: Record<string, unknown>) {
    return {
      id,
      exists: Boolean(value),
      data: () => value,
    };
  }

  const db = {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => {
          if (failure) throw failure;
          return snapshot(id, documents.get(id));
        },
      }),
      limit: () => ({
        get: async () => {
          if (failure) throw failure;
          return {
            docs: [...documents.entries()].map(([id, value]) => snapshot(id, value)),
          };
        },
      }),
    }),
  };

  return {
    documents,
    db,
    setFailure(value: Error | null) {
      failure = value;
    },
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => mocks.db,
}));

import {
  getHousingResidenceById,
  listAvailableHousingCities,
  listAvailableHousingResidences,
} from "@/lib/housing/housing-inventory.service";

function firestoreInventoryItem() {
  return {
    internalReference: "FIRESTORE-1",
    partner: { displayName: "Partenaire validé" },
    residenceName: "Résidence Firestore",
    cityCode: "TEST_CITY",
    cityLabel: "Ville Firestore",
    municipality: "Ville Firestore",
    postalCode: "75000",
    address: {
      line1: "Adresse interne",
      postalCode: "75000",
      city: "Ville Firestore",
      country: "France",
      formattedAddress: "Adresse interne, 75000 Ville Firestore, France",
    },
    publicAddress: { formattedAddress: "", displayToClient: false },
    accommodationTypes: ["studio"],
    pricing: {
      currency: "EUR",
      residenceDisplayedRent: 700,
      priceValidationStatus: "verified",
    },
    inventoryStatus: "conditionally_available",
    autoIssuance: {
      enabled: false,
      eligibilityStatus: "manual_review_only",
      manualReviewRequired: true,
    },
    availability: {},
    isVisibleToClients: true,
    isEligibleForCertificate: true,
    source: {},
    version: 1,
  };
}

describe("housing inventory source resolution", () => {
  beforeEach(() => {
    mocks.documents.clear();
    mocks.setFailure(null);
  });

  it("uses bootstrap when Firestore inventory is empty", async () => {
    const cities = await listAvailableHousingCities();
    const residences = await listAvailableHousingResidences("AIX_EN_PROVENCE");

    expect(cities.source).toBe("bootstrap");
    expect(cities.data).toHaveLength(21);
    expect(residences.source).toBe("bootstrap");
    expect(residences.data).toHaveLength(3);
    expect(residences.data[0].autoIssuance).toMatchObject({
      enabled: false,
      eligibilityStatus: "manual_review_only",
      manualReviewRequired: true,
    });
  });

  it("uses bootstrap when Firestore cannot be reached", async () => {
    mocks.setFailure(new Error("FIREBASE_ADMIN_CONFIG_MISSING"));

    const cities = await listAvailableHousingCities();

    expect(cities.source).toBe("bootstrap");
    expect(cities.data).toHaveLength(21);
  });

  it("keeps a non-empty Firestore inventory authoritative", async () => {
    mocks.documents.set("firestore-1", firestoreInventoryItem());

    const cities = await listAvailableHousingCities();
    const missingBootstrapItem = await getHousingResidenceById("AVI-LOG-FR-0001");

    expect(cities.source).toBe("firestore");
    expect(cities.data.map((item) => item.code)).toEqual(["TEST_CITY"]);
    expect(missingBootstrapItem).toEqual({ source: "firestore", data: null });
  });

  it("resolves a bootstrap residence with a forced manual-review policy", async () => {
    const result = await getHousingResidenceById("AVI-LOG-FR-0001");

    expect(result.source).toBe("bootstrap");
    expect(result.data).toMatchObject({
      id: "AVI-LOG-FR-0001",
      pricing: { residenceDisplayedRent: 627 },
      autoIssuance: {
        enabled: false,
        eligibilityStatus: "manual_review_only",
        manualReviewRequired: true,
      },
    });
  });
});
