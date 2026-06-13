import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";
import { createAdminGuardValue } from "@/lib/admin/admin-session-guard";

function request(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function plausibleFirebaseSession() {
  return `${"a".repeat(40)}.${"b".repeat(80)}.${"c".repeat(40)}`;
}

describe("admin middleware final protection contract", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function adminCookie() {
    const guard = await createAdminGuardValue({
      uid: "admin-1",
      role: "admin",
      exp: Date.now() + 60_000,
    });

    return `avi_admin_session=${plausibleFirebaseSession()}; avi_admin_guard=${guard}`;
  }

  it("allows /admin/login and marks it noindex", async () => {
    const response = await middleware(request("/admin/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects /admin to /admin/login without an admin session", async () => {
    const response = await middleware(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin",
    );
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("redirects nested /admin pages to login without an admin session", async () => {
    const response = await middleware(request("/admin/fintech/simulations"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin%2Ffintech%2Fsimulations",
    );
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("redirects placeholder admin cookies without a signed guard", async () => {
    const response = await middleware(request("/admin", "avi_admin_session=valid"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin",
    );
    expect(response.headers.get("set-cookie")).toContain("avi_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("avi_admin_guard=");
  });

  it("redirects a signed guard paired with a placeholder session cookie", async () => {
    const guard = await createAdminGuardValue({
      uid: "admin-1",
      role: "admin",
      exp: Date.now() + 60_000,
    });
    const response = await middleware(
      request("/admin", `avi_admin_session=session; avi_admin_guard=${guard}`),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin",
    );
  });

  it("fails closed when the dedicated admin session secret is missing", async () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "unused-firebase-fallback");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "unused-stripe-fallback");
    const response = await middleware(
      request(
        "/admin",
        `avi_admin_session=${plausibleFirebaseSession()}; avi_admin_guard=payload.signature`,
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin",
    );
    expect(response.headers.get("set-cookie")).toContain("avi_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("avi_admin_guard=");
  });

  it("redirects /admin after admin logout cookies are absent", async () => {
    const response = await middleware(request("/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/admin/login?next=%2Fadmin",
    );
  });

  it("allows protected admin pages with a real signed admin session guard", async () => {
    const response = await middleware(request("/admin", await adminCookie()));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("does not intercept public verification routes", async () => {
    const response = await middleware(request("/verifier/test-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });
});
