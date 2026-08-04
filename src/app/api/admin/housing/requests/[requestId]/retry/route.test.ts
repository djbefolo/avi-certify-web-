import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuthError } from "@/lib/admin/admin-auth";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  processJob: vi.fn(),
}));

vi.mock("@/lib/admin/admin-auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/admin-auth")>();
  return { ...original, requireAdmin: mocks.requireAdmin };
});

vi.mock("@/lib/certificates/certificate-workflow.service", () => ({
  processHousingCertificateJob: mocks.processJob,
}));

import { POST } from "@/app/api/admin/housing/requests/[requestId]/retry/route";

describe("housing job retry admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed without an admin session", async () => {
    mocks.requireAdmin.mockRejectedValue(
      new AdminAuthError(401, "Admin authentication required."),
    );
    const response = await POST(
      new NextRequest("http://localhost/api/admin/housing/requests/request-1/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: "request-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.processJob).not.toHaveBeenCalled();
  });

  it("processes the durable job for a verified admin", async () => {
    const actor = {
      uid: "admin-1",
      role: "super_admin",
      authProvider: "firebase-session",
    };
    mocks.requireAdmin.mockResolvedValue(actor);
    mocks.processJob.mockResolvedValue({ generated: true, certificateId: "cert-1" });
    const response = await POST(
      new NextRequest("http://localhost/api/admin/housing/requests/request-1/retry", {
        method: "POST",
      }),
      { params: Promise.resolve({ requestId: "request-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.processJob).toHaveBeenCalledWith({
      housingRequestId: "request-1",
      actor,
    });
  });
});
