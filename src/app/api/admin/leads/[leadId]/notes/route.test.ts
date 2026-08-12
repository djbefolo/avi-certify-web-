import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/leads/[leadId]/notes/route";

const mocks = vi.hoisted(() => {
  class MockValidationError extends Error {
    constructor(message: string, public readonly status: 400 | 404 = 400) {
      super(message);
    }
  }
  return { requireAdmin: vi.fn(), addProspectInternalNote: vi.fn(), MockValidationError };
});

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin: mocks.requireAdmin,
  adminErrorResponse: (error: unknown) => Response.json({ error: error instanceof Error ? error.message : "Admin error." }, { status: (error as { status?: number }).status ?? 500 }),
}));

vi.mock("@/lib/admin/admin-leads-store", () => ({ AdminLeadValidationError: mocks.MockValidationError }));
vi.mock("@/lib/admin/admin-prospect-360", () => ({ addProspectInternalNote: mocks.addProspectInternalNote }));

describe("POST /api/admin/leads/[leadId]/notes", () => {
  beforeEach(() => {
    mocks.requireAdmin.mockReset();
    mocks.addProspectInternalNote.mockReset();
  });

  it("requires admin auth and delegates one append-only note", async () => {
    const actor = { uid: "admin-1", role: "admin", authProvider: "firebase-session" };
    mocks.requireAdmin.mockResolvedValueOnce(actor);
    mocks.addProspectInternalNote.mockResolvedValueOnce({ id: "event-1", note: "Rappeler jeudi", createdAt: "2026-08-12T10:00:00.000Z", createdBy: "admin-1" });
    const request = new NextRequest("http://localhost/api/admin/leads/lead-1/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "Rappeler jeudi" }) });
    const response = await POST(request, { params: Promise.resolve({ leadId: "lead-1" }) });
    expect(response.status).toBe(201);
    expect(mocks.addProspectInternalNote).toHaveBeenCalledWith("lead-1", "Rappeler jeudi", actor);
  });

  it("does not write when authentication fails", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(Object.assign(new Error("Admin authentication required."), { status: 401 }));
    const request = new NextRequest("http://localhost/api/admin/leads/lead-1/notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "No write" }) });
    const response = await POST(request, { params: Promise.resolve({ leadId: "lead-1" }) });
    expect(response.status).toBe(401);
    expect(mocks.addProspectInternalNote).not.toHaveBeenCalled();
  });
});
