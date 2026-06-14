import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminOperationsPage from "@/app/admin/page";

const cookieJar = vi.hoisted(() => new Map<string, string>());
const verifySessionCookie = vi.hoisted(() => vi.fn());
const resolveAdminActorFromDecodedToken = vi.hoisted(() => vi.fn());
const verifyAdminGuardValue = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);

      return value ? { value } : undefined;
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/components/admin/super-admin-operations-os", () => ({
  SuperAdminOperationsOS: ({ adminRole }: { adminRole: string }) => (
    <div>SuperAdminOperationsOS rendered {adminRole}</div>
  ),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifySessionCookie,
  }),
}));

vi.mock("@/lib/admin/admin-auth", () => ({
  resolveAdminActorFromDecodedToken,
}));

vi.mock("@/lib/admin/admin-session-guard", () => ({
  verifyAdminGuardValue,
}));

describe("AdminOperationsPage server-side lock", () => {
  beforeEach(() => {
    cookieJar.clear();
    verifySessionCookie.mockReset();
    resolveAdminActorFromDecodedToken.mockReset();
    verifyAdminGuardValue.mockReset();
    redirect.mockClear();
  });

  it("anonymous /admin redirects and does not render the operations shell", async () => {
    verifyAdminGuardValue.mockResolvedValueOnce(null);

    await expect(AdminOperationsPage()).rejects.toThrow("REDIRECT:/admin/login?next=/admin");

    expect(redirect).toHaveBeenCalledWith("/admin/login?next=/admin");
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it("partial cookies do not render /admin", async () => {
    cookieJar.set("avi_admin_session", "session-only");
    verifyAdminGuardValue.mockResolvedValueOnce(null);

    await expect(AdminOperationsPage()).rejects.toThrow("REDIRECT:/admin/login?next=/admin");
  });

  it("fake cookies do not render /admin", async () => {
    cookieJar.set("avi_admin_session", "fake-session");
    cookieJar.set("avi_admin_guard", "fake-guard");
    verifyAdminGuardValue.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      exp: Date.now() + 60_000,
    });
    verifySessionCookie.mockRejectedValueOnce(new Error("revoked or invalid"));

    await expect(AdminOperationsPage()).rejects.toThrow("REDIRECT:/admin/login?next=/admin");
  });

  it("guard/session uid mismatch does not render /admin", async () => {
    cookieJar.set("avi_admin_session", "valid-session");
    cookieJar.set("avi_admin_guard", "valid-guard");
    verifyAdminGuardValue.mockResolvedValueOnce({
      uid: "admin-1",
      role: "admin",
      exp: Date.now() + 60_000,
    });
    verifySessionCookie.mockResolvedValueOnce({ uid: "admin-2" });
    resolveAdminActorFromDecodedToken.mockResolvedValueOnce({
      uid: "admin-2",
      role: "admin",
      authProvider: "firebase-session",
    });

    await expect(AdminOperationsPage()).rejects.toThrow("REDIRECT:/admin/login?next=/admin");
  });

  it("verified admin session renders the super admin operations OS", async () => {
    cookieJar.set("avi_admin_session", "valid-session");
    cookieJar.set("avi_admin_guard", "valid-guard");
    verifyAdminGuardValue.mockResolvedValueOnce({
      uid: "admin-1",
      role: "super_admin",
      exp: Date.now() + 60_000,
    });
    verifySessionCookie.mockResolvedValueOnce({ uid: "admin-1" });
    resolveAdminActorFromDecodedToken.mockResolvedValueOnce({
      uid: "admin-1",
      role: "super_admin",
      authProvider: "firebase-session",
    });

    render(await AdminOperationsPage());

    expect(screen.getByText("SuperAdminOperationsOS rendered super_admin")).toBeInTheDocument();
  });
});
