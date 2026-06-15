import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/documents/request/route";

const requireAdmin = vi.hoisted(() => vi.fn());
const requestDocument = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/admin-auth", () => ({
  requireAdmin,
  adminErrorResponse: (error: unknown) => {
    const status = (error as { status?: number }).status;

    return Response.json(
      { error: (error as Error).message },
      { status: status ?? 500 },
    );
  },
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    requestDocument,
  }),
}));

const actor = {
  uid: "admin-1",
  email: "admin@avicertify.fr",
  role: "admin" as const,
  authProvider: "firebase-session" as const,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/documents/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/documents/request", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requestDocument.mockReset();
  });

  it("rejects anonymous requests before touching the document store", async () => {
    requireAdmin.mockRejectedValueOnce(
      Object.assign(new Error("Admin authentication required."), {
        status: 401,
      }),
    );

    const response = await POST(
      request({ caseId: "case-1", documentType: "passport" }),
    );

    expect(response.status).toBe(401);
    expect(requestDocument).not.toHaveBeenCalled();
  });

  it("creates each validated document request with the authenticated actor", async () => {
    requireAdmin.mockResolvedValueOnce(actor);
    requestDocument
      .mockResolvedValueOnce({ document: { id: "req-1" } })
      .mockResolvedValueOnce({ document: { id: "req-2" } });

    const response = await POST(
      request({
        caseId: "case-1",
        documentTypes: ["passport", "admission_letter"],
        message: "Merci de compléter le dossier.",
      }),
    );

    expect(response.status).toBe(200);
    expect(requestDocument).toHaveBeenNthCalledWith(
      1,
      "case-1",
      {
        documentType: "passport",
        message: "Merci de compléter le dossier.",
      },
      actor,
    );
    expect(requestDocument).toHaveBeenNthCalledWith(
      2,
      "case-1",
      {
        documentType: "admission_letter",
        message: "Merci de compléter le dossier.",
      },
      actor,
    );
  });

  it("rejects unsupported document types", async () => {
    requireAdmin.mockResolvedValueOnce(actor);

    const response = await POST(
      request({ caseId: "case-1", documentType: "executable" }),
    );

    expect(response.status).toBe(500);
    expect(requestDocument).not.toHaveBeenCalled();
  });
});
