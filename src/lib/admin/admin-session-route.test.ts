import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/session/login/route";
import { POST as LOGOUT } from "@/app/api/admin/session/logout/route";

const verifyIdToken = vi.fn();
const createSessionCookie = vi.fn();
const userDocGet = vi.fn();

function recentAuthTime() {
  return Math.floor(Date.now() / 1000);
}

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

  it("creates secure admin session cookies for custom-claim super admins", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-1",
      email: "admin@example.com",
      admin: true,
      role: "super_admin",
      auth_time: recentAuthTime(),
    });
    createSessionCookie.mockResolvedValueOnce("firebase-session-cookie");

    const response = await POST(loginRequest());

    expect(response.status).toBe(200);
    expect(verifyIdToken).toHaveBeenCalledWith("firebase-id-token", true);
    expect(createSessionCookie).toHaveBeenCalledWith("firebase-id-token", {
      expiresIn: 4 * 60 * 60 * 1000,
    });
    expect(response.headers.get("set-cookie")).toContain("avi_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("avi_admin_guard=");
  });

  it("accepts admin=true without an explicit role claim", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-2",
      email: "admin2@example.com",
      admin: true,
      auth_time: recentAuthTime(),
    });
    createSessionCookie.mockResolvedValueOnce("firebase-session-cookie");

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.actor.role).toBe("admin");
    expect(createSessionCookie).toHaveBeenCalled();
  });

  it("accepts role=admin without the boolean admin claim", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-3",
      email: "admin3@example.com",
      role: "admin",
      auth_time: recentAuthTime(),
    });
    createSessionCookie.mockResolvedValueOnce("firebase-session-cookie");

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.actor.role).toBe("admin");
    expect(createSessionCookie).toHaveBeenCalled();
  });

  it("rejects users whose admin role exists only in Firestore", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "user-1",
      email: "user@example.com",
      auth_time: recentAuthTime(),
    });
    userDocGet.mockResolvedValueOnce({
      data: () => ({ role: "admin" }),
    });

    const response = await POST(loginRequest());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Authenticated Firebase user is missing AVI CERTIFY admin claims.",
      code: "ADMIN_CLAIM_REQUIRED",
    });
    expect(createSessionCookie).not.toHaveBeenCalled();
    expect(userDocGet).not.toHaveBeenCalled();
  });

  it("rejects revoked Firebase credentials", async () => {
    verifyIdToken.mockRejectedValueOnce(new Error("auth/id-token-revoked"));

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Invalid admin credentials or expired Firebase token.",
      code: "INVALID_ADMIN_CREDENTIALS",
    });
    expect(createSessionCookie).not.toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalledWith("firebase-id-token", true);
  });

  it("rejects admin authentication older than ten minutes", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-old-auth",
      email: "admin@example.com",
      role: "admin",
      auth_time: recentAuthTime() - 11 * 60,
    });

    const response = await POST(loginRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Recent Firebase authentication is required for admin access.",
      code: "ADMIN_RECENT_AUTH_REQUIRED",
    });
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it("fails securely when the dedicated admin session secret is absent", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "unused-firebase-fallback");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "unused-stripe-fallback");
    verifyIdToken.mockResolvedValueOnce({
      uid: "admin-no-secret",
      email: "admin@example.com",
      role: "admin",
      auth_time: recentAuthTime(),
    });

    const response = await POST(loginRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Admin authentication configuration is unavailable.",
      code: "ADMIN_AUTH_CONFIG_UNAVAILABLE",
    });
    expect(createSessionCookie).not.toHaveBeenCalled();
  });

  it("clears both admin session cookies on logout", async () => {
    const response = await LOGOUT();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toContain("avi_admin_session=");
    expect(setCookie).toContain("avi_admin_guard=");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Path=/");
  });
});
