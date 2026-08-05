import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireClient: vi.fn(),
  listCities: vi.fn(),
}));

vi.mock("@/app/api/client/housing/_auth", () => ({
  requireVerifiedHousingClient: mocks.requireClient,
  housingClientErrorResponse: (error: unknown) =>
    NextResponse.json(
      { error: error instanceof Error ? error.message : "UNKNOWN" },
      { status: 503 },
    ),
}));

vi.mock("@/lib/housing/housing-inventory.service", () => ({
  listAvailableHousingCities: mocks.listCities,
}));

import { GET } from "@/app/api/client/housing/cities/route";

describe("GET /api/client/housing/cities", () => {
  beforeEach(() => {
    mocks.requireClient.mockResolvedValue({ uid: "client-1" });
    mocks.listCities.mockResolvedValue({
      source: "bootstrap",
      data: [
        {
          code: "AIX_EN_PROVENCE",
          label: "Aix-en-Provence",
          country: "France",
          residenceCount: 3,
          minimumDisplayedRent: 582,
          currency: "EUR",
          availabilityLabel: "Pré-réservation conditionnelle",
        },
      ],
    });
  });

  it("returns inventory source metadata and safe city summaries", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/client/housing/cities"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      source: "bootstrap",
      cities: [
        expect.objectContaining({
          code: "AIX_EN_PROVENCE",
          residenceCount: 3,
          minimumDisplayedRent: 582,
        }),
      ],
    });
  });

  it("returns a controlled unavailable response", async () => {
    mocks.listCities.mockResolvedValue({ source: "unavailable", data: [] });

    const response = await GET(
      new NextRequest("http://localhost/api/client/housing/cities"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "HOUSING_INVENTORY_UNAVAILABLE",
    });
  });
});
