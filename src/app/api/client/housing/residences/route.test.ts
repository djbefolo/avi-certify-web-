import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireClient: vi.fn(),
  listInventory: vi.fn(),
}));

vi.mock("@/app/api/client/housing/_auth", () => ({
  requireVerifiedHousingClient: mocks.requireClient,
  housingClientErrorResponse: (error: unknown) => {
    throw error;
  },
}));

vi.mock("@/lib/housing/housing-inventory.service", () => ({
  listPublicHousingInventory: mocks.listInventory,
}));

import { GET } from "@/app/api/client/housing/residences/route";

function inventoryItem(displayToClient: boolean) {
  return {
    id: displayToClient ? "visible" : "hidden",
    internalReference: displayToClient ? "AVI-LOG-FR-0001" : "AVI-LOG-FR-0002",
    cityCode: "paris",
    cityLabel: "Paris",
    municipality: "Paris",
    residenceName: displayToClient ? "Residence publique" : "Residence privee",
    partner: { displayName: "Partenaire" },
    accommodationTypes: ["studio"],
    pricing: {
      currency: "EUR",
      residenceDisplayedRent: 720,
    },
    inventoryStatus: "conditionally_available",
    publicDescription: "Disponibilite conditionnelle.",
    address: {
      line1: "Adresse interne confidentielle",
      postalCode: "75001",
      city: "Paris",
      country: "France",
      formattedAddress: "Adresse interne confidentielle, 75001 Paris, France",
    },
    publicAddress: {
      formattedAddress: "10 rue Publique, 75001 Paris, France",
      displayToClient,
    },
  };
}

describe("GET /api/client/housing/residences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireClient.mockResolvedValue({ uid: "client-1" });
    mocks.listInventory.mockResolvedValue([inventoryItem(true), inventoryItem(false)]);
  });

  it("exposes only an explicitly validated public address", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/client/housing/residences?cityCode=paris"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.residences[0].publicAddress).toEqual({
      formattedAddress: "10 rue Publique, 75001 Paris, France",
      displayToClient: true,
    });
    expect(payload.residences[1].publicAddress).toBeNull();
    expect(payload.residences[0]).not.toHaveProperty("address");
    expect(payload.residences[1]).not.toHaveProperty("address");
  });
});
