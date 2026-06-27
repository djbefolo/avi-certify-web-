import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GET,
  PATCH,
} from "@/app/api/admin/leads/[leadId]/route";

const routeMocks = vi.hoisted(() => {
  class MockAdminLeadValidationError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 404 = 400,
    ) {
      super(message);
    }
  }

  return {
    AdminLeadValidationError: MockAdminLeadValidationError,
    getLead: vi.fn(),
    requireAdmin: vi.fn(),
    updateLeadCrm: vi.fn(),
  };
});

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin: routeMocks.requireAdmin,
  adminErrorResponse: (error: unknown) => {
    const status = (error as { status?: number }).status;

    return Response.json(
      { error: error instanceof Error ? error.message : "Admin error." },
      { status: status ?? 500 },
    );
  },
}));

vi.mock("@/lib/admin/admin-leads-store", () => ({
  AdminLeadValidationError: routeMocks.AdminLeadValidationError,
  getAdminLeadsStore: () => ({
    getLead: routeMocks.getLead,
    updateLeadCrm: routeMocks.updateLeadCrm,
  }),
}));

function request(path = "http://localhost/api/admin/leads/lead-1", body?: unknown) {
  return new NextRequest(path, {
    method: body ? "PATCH" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = { params: Promise.resolve({ leadId: "lead-1" }) };

describe("/api/admin/leads/[leadId]", () => {
  beforeEach(() => {
    routeMocks.requireAdmin.mockReset();
    routeMocks.getLead.mockReset();
    routeMocks.updateLeadCrm.mockReset();
  });

  it("returns lead details for an authorized admin", async () => {
    routeMocks.requireAdmin.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      authProvider: "firebase-session",
    });
    routeMocks.getLead.mockResolvedValueOnce({
      id: "lead-1",
      email: "awa@example.com",
      crmStatus: "new",
    });

    const response = await GET(request(), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      lead: {
        id: "lead-1",
        email: "awa@example.com",
        crmStatus: "new",
      },
    });
    expect(routeMocks.getLead).toHaveBeenCalledWith("lead-1");
  });

  it("updates CRM fields through PATCH", async () => {
    routeMocks.requireAdmin.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      authProvider: "firebase-session",
    });
    routeMocks.updateLeadCrm.mockResolvedValueOnce({
      id: "lead-1",
      crmStatus: "qualified",
      crmNotes: "Projet confirmé.",
    });

    const response = await PATCH(
      request("http://localhost/api/admin/leads/lead-1", {
        crmStatus: "qualified",
        crmNotes: "Projet confirmé.",
      }),
      params,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      lead: {
        id: "lead-1",
        crmStatus: "qualified",
        crmNotes: "Projet confirmé.",
      },
    });
    expect(routeMocks.updateLeadCrm).toHaveBeenCalledWith("lead-1", {
      crmStatus: "qualified",
      crmNotes: "Projet confirmé.",
    });
  });

  it("returns 400 when PATCH tries to mutate disallowed lead fields", async () => {
    routeMocks.requireAdmin.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      authProvider: "firebase-session",
    });
    routeMocks.updateLeadCrm.mockRejectedValueOnce(
      new routeMocks.AdminLeadValidationError("Unsupported CRM lead fields: email."),
    );

    const response = await PATCH(
      request("http://localhost/api/admin/leads/lead-1", {
        email: "other@example.com",
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Unsupported CRM lead fields: email.",
    });
  });

  it("does not call the store without admin authentication", async () => {
    routeMocks.requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin authentication required."), { status: 401 }),
    );

    const response = await PATCH(
      request("http://localhost/api/admin/leads/lead-1", {
        crmStatus: "contacted",
      }),
      params,
    );

    expect(response.status).toBe(401);
    expect(routeMocks.updateLeadCrm).not.toHaveBeenCalled();
  });
});
