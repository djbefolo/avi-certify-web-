import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/client/documents/route";

const verifyIdToken = vi.hoisted(() => vi.fn());
const getDocuments = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
  }),
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: getDocuments,
        }),
      }),
    }),
  }),
}));

describe("client document projection", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    getDocuments.mockReset();
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    getDocuments.mockResolvedValue({
      docs: [
        {
          id: "doc-1",
          data: () => ({
            ownerId: "user-1",
            documentType: "passport",
            status: "uploaded",
            originalFileName: "passport.pdf",
            contentType: "application/pdf",
            size: 1024,
            storagePath: "users/user-1/documents/doc-1-passport.pdf",
            verifiedBy: "admin-1",
            deliveryStatus: "SENT",
            internalAudit: { source: "admin" },
          }),
        },
      ],
    });
  });

  it("returns client-safe fields without raw storage or internal admin metadata", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/client/documents", {
        headers: { authorization: "Bearer client-token" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.documents[0]).toMatchObject({
      id: "doc-1",
      documentType: "passport",
      status: "uploaded",
      hasUploadedFile: true,
    });
    expect(body.documents[0]).not.toHaveProperty("storagePath");
    expect(body.documents[0]).not.toHaveProperty("verifiedBy");
    expect(body.documents[0]).not.toHaveProperty("deliveryStatus");
    expect(body.documents[0]).not.toHaveProperty("internalAudit");
    expect(body.documents[0]).not.toHaveProperty("ownerId");
  });
});
