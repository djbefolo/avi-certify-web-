import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuthError } from "@/lib/admin/admin-auth";
import { POST as approveDocument } from "@/app/api/admin/documents/approve/route";
import { POST as rejectDocument } from "@/app/api/admin/documents/reject/route";
import { GET as downloadDocument } from "@/app/api/admin/documents/[documentId]/download/route";
import { GET as previewDocument } from "@/app/api/admin/documents/[documentId]/preview/route";
import type {
  AdminDocumentRecord,
  AdminDocumentVerificationStatus,
} from "@/lib/documents/admin-document.service";

const requireAdmin = vi.hoisted(() => vi.fn());
const getAdminDocumentById = vi.hoisted(() => vi.fn());
const transitionAdminDocument = vi.hoisted(() => vi.fn());
const getMetadata = vi.hoisted(() => vi.fn());
const download = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/admin-auth")>();

  return {
    ...actual,
    requireAdmin,
    adminErrorResponse: (error: unknown) =>
      error instanceof actual.AdminAuthError
        ? NextResponse.json(
            { error: error.message },
            { status: error.status },
          )
        : NextResponse.json({ error: "Unexpected admin error." }, { status: 500 }),
  };
});

vi.mock("@/lib/documents/admin-document.service", () => ({
  AdminDocumentServiceError: class AdminDocumentServiceError extends Error {},
  getAdminDocumentById,
  transitionAdminDocument,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorage: () => ({
    bucket: () => ({
      file: () => ({
        getMetadata,
        download,
      }),
    }),
  }),
}));

const actor = {
  uid: "admin-1",
  email: "admin@example.com",
  role: "admin" as const,
  authProvider: "firebase-session" as const,
};

const uploadedDocument: AdminDocumentRecord = {
  id: "doc-1",
  uid: "user-1",
  caseId: "case-1",
  documentType: "passport",
  fileName: "passport.pdf",
  storagePath: "users/user-1/documents/doc-1-passport.pdf",
  mimeType: "application/pdf",
  size: 1024,
  uploadStatus: "uploaded",
  verificationStatus: "UPLOADED",
  rejectionReason: null,
  uploadedAt: "2026-06-13T08:00:00.000Z",
  verifiedAt: null,
  verifiedBy: null,
};

function postRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function fileParams() {
  return { params: Promise.resolve({ documentId: "doc-1" }) };
}

describe("admin document route security", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    getAdminDocumentById.mockReset();
    transitionAdminDocument.mockReset();
    getMetadata.mockReset();
    download.mockReset();
    requireAdmin.mockResolvedValue(actor);
    getAdminDocumentById.mockResolvedValue(uploadedDocument);
    transitionAdminDocument.mockImplementation(
      async (
        documentId: string,
        input: { verificationStatus: AdminDocumentVerificationStatus },
      ) => ({
        ...uploadedDocument,
        id: documentId,
        verificationStatus: input.verificationStatus,
      }),
    );
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: { ownerId: "user-1", documentId: "doc-1" },
      },
    ]);
    download.mockResolvedValue([Buffer.from("document")]);
  });

  it("rejects approval of a requested document without a file", async () => {
    getAdminDocumentById.mockResolvedValueOnce({
      ...uploadedDocument,
      storagePath: "",
      size: 0,
      verificationStatus: "REQUESTED",
    });

    const response = await approveDocument(
      postRequest("/api/admin/documents/approve", { documentId: "doc-1" }),
    );

    expect(response.status).toBe(409);
    expect(transitionAdminDocument).not.toHaveBeenCalled();
  });

  it("approves an uploaded document only after Storage validation", async () => {
    const response = await approveDocument(
      postRequest("/api/admin/documents/approve", { documentId: "doc-1" }),
    );

    expect(response.status).toBe(200);
    expect(getMetadata).toHaveBeenCalledTimes(1);
    expect(transitionAdminDocument).toHaveBeenCalledWith(
      "doc-1",
      { verificationStatus: "APPROVED" },
      actor,
    );
  });

  it("rejects a document decision without a reason", async () => {
    const response = await rejectDocument(
      postRequest("/api/admin/documents/reject", { documentId: "doc-1" }),
    );

    expect(response.status).toBe(400);
    expect(transitionAdminDocument).not.toHaveBeenCalled();
  });

  it("rejects anonymous preview and download requests", async () => {
    requireAdmin.mockRejectedValue(
      new AdminAuthError(401, "Admin authentication required."),
    );

    const preview = await previewDocument(
      new NextRequest("http://localhost/api/admin/documents/doc-1/preview"),
      fileParams(),
    );
    const fileDownload = await downloadDocument(
      new NextRequest("http://localhost/api/admin/documents/doc-1/download"),
      fileParams(),
    );

    expect(preview.status).toBe(401);
    expect(fileDownload.status).toBe(401);
    expect(download).not.toHaveBeenCalled();
  });

  it("rejects file access when no uploaded file exists", async () => {
    getAdminDocumentById.mockResolvedValue({
      ...uploadedDocument,
      storagePath: "",
    });

    const preview = await previewDocument(
      new NextRequest("http://localhost/api/admin/documents/doc-1/preview"),
      fileParams(),
    );
    const fileDownload = await downloadDocument(
      new NextRequest("http://localhost/api/admin/documents/doc-1/download"),
      fileParams(),
    );

    expect(preview.status).toBe(409);
    expect(fileDownload.status).toBe(409);
    expect(download).not.toHaveBeenCalled();
  });

  it("serves previews inline with restrictive browser security headers", async () => {
    const response = await previewDocument(
      new NextRequest("http://localhost/api/admin/documents/doc-1/preview"),
      fileParams(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^inline;/,
    );
    expect(response.headers.get("Content-Disposition")).not.toContain(
      uploadedDocument.storagePath,
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "sandbox",
    );
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "same-origin",
    );
  });
});
