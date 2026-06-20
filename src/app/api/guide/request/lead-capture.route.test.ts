import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => {
  class MockLeadCaptureError extends Error {
    constructor(
      message: string,
      public readonly details?: Record<string, string[] | undefined>,
    ) {
      super(message);
    }
  }

  return {
    captureLead: vi.fn(),
    LeadCaptureError: MockLeadCaptureError,
  };
});

vi.mock("@/lib/server/lead-capture.service", () => ({
  captureLead: serviceMocks.captureLead,
  LeadCaptureError: serviceMocks.LeadCaptureError,
}));

import { POST } from "@/app/api/guide/request/route";

function request(body: unknown) {
  return new NextRequest("https://www.avicertify.fr/api/guide/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/guide/request", () => {
  beforeEach(() => {
    serviceMocks.captureLead.mockReset();
  });

  it("captures a guide request and forces the guide source", async () => {
    serviceMocks.captureLead.mockResolvedValueOnce({
      id: "lead-1",
      status: "NEW",
    });

    const response = await POST(
      request({
        fullName: "Awa Ndiaye",
        email: "awa@example.com",
        source: "pricing",
        marketingConsent: true,
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      leadId: "lead-1",
      status: "NEW",
    });
    expect(serviceMocks.captureLead).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Awa Ndiaye",
        email: "awa@example.com",
        source: "guide",
        marketingConsent: true,
      }),
    );
  });

  it("returns a controlled validation error", async () => {
    serviceMocks.captureLead.mockRejectedValueOnce(
      new serviceMocks.LeadCaptureError("Les informations du lead sont invalides.", {
        marketingConsent: ["Le consentement marketing est requis."],
      }),
    );

    const response = await POST(
      request({
        fullName: "Awa Ndiaye",
        email: "awa@example.com",
        marketingConsent: false,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "Les informations du lead sont invalides.",
      details: {
        marketingConsent: ["Le consentement marketing est requis."],
      },
    });
  });
});
