import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/leads/route";

const requireAdmin = vi.hoisted(() => vi.fn());
const listLeads = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin,
  adminErrorResponse: (error: unknown) => {
    const status = (error as { status?: number }).status;

    return Response.json(
      { error: error instanceof Error ? error.message : "Admin error." },
      { status: status ?? 500 },
    );
  },
}));

vi.mock("@/lib/admin/admin-leads-store", () => ({
  getAdminLeadsStore: () => ({
    listLeads,
  }),
}));

function request(path = "http://localhost/api/admin/leads") {
  return new NextRequest(path);
}

describe("/api/admin/leads", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    listLeads.mockReset();
  });

  it("requires admin authentication to list leads", async () => {
    requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin authentication required."), { status: 401 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Admin authentication required.",
    });
    expect(listLeads).not.toHaveBeenCalled();
  });

  it("returns leads for an authorized admin", async () => {
    requireAdmin.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      authProvider: "firebase-session",
    });
    listLeads.mockResolvedValueOnce({
      leads: [
        {
          id: "lead-1",
          email: "awa@example.com",
          crmStatus: "new",
        },
      ],
      stats: { total: 1, new: 1 },
    });

    const response = await GET(
      request("http://localhost/api/admin/leads?crmStatus=new&query=awa&limit=25"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      leads: [
        {
          id: "lead-1",
          email: "awa@example.com",
          crmStatus: "new",
        },
      ],
      stats: { total: 1, new: 1 },
    });
    expect(listLeads).toHaveBeenCalledWith({
      crmStatus: "new",
      limit: 25,
      query: "awa",
    });
  });
});
