import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/admin/clients/route";

const requireAdmin = vi.hoisted(() => vi.fn());
const listClients = vi.hoisted(() => vi.fn());
const overview = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin,
  adminErrorResponse: (error: unknown) => {
    const status = (error as { status?: number }).status;

    if (status) {
      return Response.json(
        { error: (error as Error).message },
        { status },
      );
    }

    return Response.json({ error: "Unexpected admin fintech error." }, { status: 500 });
  },
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    listClients,
    overview,
  }),
}));

function request(path = "http://localhost/api/admin/clients") {
  return new NextRequest(path);
}

describe("/api/admin/clients", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    listClients.mockReset();
    overview.mockReset();
  });

  it("rejects anonymous admin clients API access", async () => {
    requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin authentication required."), { status: 401 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Admin authentication required.",
    });
    expect(listClients).not.toHaveBeenCalled();
  });

  it("rejects non-admin clients API access", async () => {
    requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin role required."), { status: 403 }),
    );

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Admin role required." });
  });

  it("returns clients for an authorized admin actor", async () => {
    requireAdmin.mockResolvedValueOnce({
      uid: "admin-1",
      email: "admin@avicertify.fr",
      role: "super_admin",
      authProvider: "firebase-session",
    });
    listClients.mockResolvedValueOnce([
      {
        uid: "client-1",
        email: "student@example.com",
        fullName: "Awa Student",
      },
    ]);
    overview.mockResolvedValueOnce({ clientsTotal: 1 });

    const response = await GET(request("http://localhost/api/admin/clients?query=awa"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      clients: [
        {
          uid: "client-1",
          email: "student@example.com",
          fullName: "Awa Student",
        },
      ],
      overview: { clientsTotal: 1 },
    });
    expect(listClients).toHaveBeenCalledWith(
      expect.objectContaining({ query: "awa" }),
    );
  });
});
