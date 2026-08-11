import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createLead: vi.fn(),
  sendAdminNewLeadEmail: vi.fn(),
  sendLeadConfirmationEmail: vi.fn(),
  validateLead: vi.fn(),
}));

vi.mock("@/lib/server/leads.service", () => ({
  createLead: routeMocks.createLead,
  validateLead: routeMocks.validateLead,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendAdminNewLeadEmail: routeMocks.sendAdminNewLeadEmail,
  sendLeadConfirmationEmail: routeMocks.sendLeadConfirmationEmail,
}));

import { POST } from "@/app/api/leads/route";

const validLead = {
  fullName: "Awa Ndiaye",
  phone: "+237699000000",
  email: "awa@example.com",
  residenceCountry: "cameroun",
  destinationCountry: "france",
  requestedService: "hebergement",
  message: null,
  consent: true,
};

function request(body: unknown) {
  return new NextRequest("https://www.avicertify.fr/api/leads", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.42",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    routeMocks.createLead.mockReset();
    routeMocks.sendAdminNewLeadEmail.mockReset();
    routeMocks.sendLeadConfirmationEmail.mockReset();
    routeMocks.validateLead.mockReset();
  });

  it("keeps the public lead creation and confirmation flow unchanged", async () => {
    routeMocks.validateLead.mockReturnValueOnce(validLead);
    routeMocks.createLead.mockResolvedValueOnce({ id: "public-lead-1" });
    routeMocks.sendLeadConfirmationEmail.mockResolvedValueOnce(undefined);
    routeMocks.sendAdminNewLeadEmail.mockResolvedValueOnce(undefined);

    const response = await POST(request(validLead));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      id: "public-lead-1",
      message: "Lead created.",
    });
    expect(routeMocks.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        ...validLead,
        source: "landing_page",
        receivedAt: expect.any(Number),
        requestContext: {
          ipAddress: "203.0.113.42",
          userAgent: null,
        },
      }),
    );
    expect(routeMocks.sendLeadConfirmationEmail).toHaveBeenCalledWith(validLead);
    expect(routeMocks.sendAdminNewLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        ...validLead,
        id: "public-lead-1",
        receivedAt: expect.any(Number),
      }),
    );
  });
});
