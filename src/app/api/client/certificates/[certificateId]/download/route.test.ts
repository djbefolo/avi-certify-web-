import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const verifyIdToken = vi.hoisted(() => vi.fn());
const getDocument = vi.hoisted(() => vi.fn());
const getMetadata = vi.hoisted(() => vi.fn());
const download = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      doc: () => ({
        get: getDocument,
      }),
    }),
  }),
  getAdminStorage: () => ({
    bucket: () => ({
      file: () => ({
        getMetadata,
        download,
      }),
    }),
  }),
}));

function request(authenticated = true) {
  return new NextRequest(
    "http://localhost/api/client/certificates/cert-1/download",
    {
      headers: authenticated
        ? { authorization: "Bearer client-token" }
        : undefined,
    },
  );
}

const context = { params: Promise.resolve({ certificateId: "cert-1" }) };

describe("client certificate download route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: "client-1" });
    getDocument.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: "client-1",
        documentType: "accommodation_certificate",
        status: "generated",
        storagePath: "users/client-1/documents/cert-1-attestation.pdf",
        certificateNumber: "AVI-HBG-2026-CERT1",
      }),
    });
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: {
          ownerId: "client-1",
          uid: "client-1",
          documentId: "cert-1",
          certificateId: "cert-1",
          documentType: "accommodation_certificate",
        },
      },
    ]);
    download.mockResolvedValue([Buffer.from("%PDF-certificate")]);
  });

  it("streams an owned generated certificate as an attachment", async () => {
    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      "%PDF-certificate",
    );
  });

  it("does not reveal a certificate owned by another client", async () => {
    getDocument.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerId: "client-2",
        documentType: "accommodation_certificate",
        status: "generated",
        storagePath: "users/client-2/documents/cert-1-attestation.pdf",
      }),
    });

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    const response = await GET(request(false), context);

    expect(response.status).toBe(401);
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("rejects inconsistent storage metadata", async () => {
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: {
          ownerId: "client-2",
          documentId: "cert-1",
        },
      },
    ]);

    const response = await GET(request(), context);

    expect(response.status).toBe(409);
    expect(download).not.toHaveBeenCalled();
  });
});
