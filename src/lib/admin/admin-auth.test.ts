import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const verifySessionCookie = vi.fn();
const userDocGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
    verifySessionCookie,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: userDocGet,
      }),
    }),
  }),
}));

function adminRequest(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/admin/fintech/products", {
    headers,
  });
}

describe("requireAdmin security guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("accepts the configured dev token in test", async () => {
    vi.stubEnv("ADMIN_FINTECH_DEV_TOKEN", "test-admin-token");
    const { requireAdmin } = await import("@/lib/admin/admin-auth");

    const actor = await requireAdmin(
      adminRequest({ "x-admin-dev-token": "test-admin-token" }),
    );

    expect(actor).toMatchObject({
      uid: "local-admin",
      role: "admin",
      authProvider: "dev-token",
    });
  });

  it("rejects the dev token in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_FINTECH_DEV_TOKEN", "test-admin-token");
    const { AdminAuthError, requireAdmin } = await import("@/lib/admin/admin-auth");

    await expect(
      requireAdmin(adminRequest({ "x-admin-dev-token": "test-admin-token" })),
    ).rejects.toBeInstanceOf(AdminAuthError);
    await expect(
      requireAdmin(adminRequest({ "x-admin-dev-token": "test-admin-token" })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("rejects missing authentication", async () => {
    const { AdminAuthError, requireAdmin } = await import("@/lib/admin/admin-auth");

    await expect(requireAdmin(adminRequest())).rejects.toBeInstanceOf(AdminAuthError);
    await expect(requireAdmin(adminRequest())).rejects.toMatchObject({
      status: 401,
    });
  });

  it("rejects authenticated non-admin users", async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: "user-1",
      email: "student@example.com",
      role: "user",
    });
    userDocGet.mockResolvedValueOnce({
      data: () => ({ role: "user" }),
    });
    const { AdminAuthError, requireAdmin } = await import("@/lib/admin/admin-auth");
    const promise = requireAdmin(
      adminRequest({ authorization: "Bearer firebase-token" }),
    );

    await expect(promise).rejects.toBeInstanceOf(AdminAuthError);
    await expect(promise).rejects.toMatchObject({ status: 403 });
  });

  it("accepts Firebase users with an admin role claim", async () => {
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-1",
      email: "admin@example.com",
      role: "admin",
    });
    const { requireAdmin } = await import("@/lib/admin/admin-auth");

    const actor = await requireAdmin(
      adminRequest({ authorization: "Bearer firebase-token" }),
    );

    expect(actor).toMatchObject({
      uid: "admin-1",
      email: "admin@example.com",
      role: "admin",
      authProvider: "firebase",
    });
  });

  it("accepts Firebase session cookies with a super admin claim", async () => {
    verifySessionCookie.mockResolvedValueOnce({
      uid: "admin-2",
      email: "super@example.com",
      role: "super_admin",
    });
    const { requireAdmin } = await import("@/lib/admin/admin-auth");

    const actor = await requireAdmin(
      adminRequest({ cookie: "avi_admin_session=session-cookie" }),
    );

    expect(actor).toMatchObject({
      uid: "admin-2",
      email: "super@example.com",
      role: "super_admin",
      authProvider: "firebase-session",
    });
    expect(verifySessionCookie).toHaveBeenCalledWith("session-cookie", true);
  });
});
