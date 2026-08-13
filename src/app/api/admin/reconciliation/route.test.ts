import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  buildPlan: vi.fn(),
}));

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
  adminErrorResponse: (error: { status?: number; message?: string }) =>
    Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));
vi.mock("@/lib/server/historical-reconciliation.service", () => ({
  buildHistoricalReconciliationPlan: mocks.buildPlan,
}));

import { GET } from "@/app/api/admin/reconciliation/route";

const request = (path = "http://localhost/api/admin/reconciliation") =>
  new NextRequest(path);

describe("historical reconciliation admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildPlan.mockResolvedValue({ mode: "DRY_RUN", inspected: 0 });
  });

  it("rejects unauthenticated access", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(Object.assign(new Error("Admin authentication required."), { status: 401 }));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.buildPlan).not.toHaveBeenCalled();
  });

  it("rejects a non-super-admin without reading historical data", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ uid: "admin-1", role: "admin" });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.buildPlan).not.toHaveBeenCalled();
  });

  it("allows only bounded Super Admin dry-run reads", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ uid: "super-1", role: "super_admin" });
    const response = await GET(request("http://localhost/api/admin/reconciliation?limit=999"));
    expect(response.status).toBe(200);
    expect(mocks.buildPlan).toHaveBeenCalledWith({ limit: 50, cursor: null });
    expect(await response.json()).toEqual({ plan: { mode: "DRY_RUN", inspected: 0 } });
  });
});
