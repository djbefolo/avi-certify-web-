import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/session/login/route";

const verifyIdToken = vi.fn();
const createSessionCookie = vi.fn();
const userDocGet = vi.fn();

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
    createSessionCookie,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: userDocGet,
      }),
    }),
  }),
}));

function loginRequest(idToken = "firebase-id-token") {
  return new NextRequest("http://localhost/api/admin/session/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });
}

describe("admin session login route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("creates secure admin session cookies for custom-claim admins", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-1",
      email: "admin@example.com",
      role: "super_admin",
    });
    createSessionCookie.mockResolvedValueOnce("firebase-session-cookie");

    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(createSessionCookie).toHaveBeenCalledWith("firebase-id-token", {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
    expect(response.headers.get("set-cookie")).toContain("avi_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("avi_admin_guard=");
  });

  it("rejects Firebase users without admin claims or admin role", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "user-1",
      email: "user@example.com",
      role: "user",
    });
    userDocGet.mockResolvedValueOnce({
      data: () => ({ role: "user" }),
    });

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    expect(createSessionCookie).not.toHaveBeenCalled();
  });
});
