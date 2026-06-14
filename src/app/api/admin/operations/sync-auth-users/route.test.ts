import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/operations/sync-auth-users/route";

const requireAdmin = vi.hoisted(() => vi.fn());
const syncAuthUsers = vi.hoisted(() => vi.fn());

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
    syncAuthUsers,
  }),
}));

function request() {
  return new NextRequest("http://localhost/api/admin/operations/sync-auth-users", {
    method: "POST",
  });
}

describe("/api/admin/operations/sync-auth-users", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    syncAuthUsers.mockReset();
  });

  it("allows super_admin to sync Firebase Auth users", async () => {
    const actor = {
      uid: "admin-1",
      email: "admin@avicertify.fr",
      role: "super_admin",
      authProvider: "firebase-session",
    };
    requireAdmin.mockResolvedValueOnce(actor);
    syncAuthUsers.mockResolvedValueOnce({ synced: 3, created: 2, updated: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      result: { synced: 3, created: 2, updated: 1 },
    });
    expect(syncAuthUsers).toHaveBeenCalledWith(actor);
  });

  it("does not allow anonymous users to sync Firebase Auth users", async () => {
    requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin authentication required."), { status: 401 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(syncAuthUsers).not.toHaveBeenCalled();
  });
});
