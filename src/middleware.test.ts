import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/middleware";
import { createAdminGuardValue } from "@/lib/admin/admin-session-guard";

function request(pathname: string, cookie?: string) {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("admin middleware final protection contract", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-admin-session-secret");
  });

  async function adminCookie() {
    const guard = await createAdminGuardValue({
      uid: "admin-1",
      role: "admin",
      exp: Date.now() + 60_000,
    });

    return `avi_admin_session=session; avi_admin_guard=${guard}`;
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
