import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/client/documents/upload/route";

const verifyIdToken = vi.hoisted(() => vi.fn());
const getMetadata = vi.hoisted(() => vi.fn());
const transactionSet = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  document: {} as Record<string, unknown> | null,
  clientCase: {} as Record<string, unknown> | null,
  operationsDocument: null as Record<string, unknown> | null,
}));

type TestReference = {
  collectionName: string;
  id: string;
};

function snapshot(data: Record<string, unknown> | null) {
  return {
    exists: Boolean(data),
    data: () => data ?? undefined,
  };
}

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
  }),
  getAdminStorage: () => ({
    bucket: () => ({
      file: () => ({
        getMetadata,
      }),
    }),
  }),
  getAdminFirestore: () => ({
    collection: (collectionName: string) => ({
      doc: (id: string): TestReference => ({ collectionName, id }),
    }),
    runTransaction: async (
      callback: (transaction: {
        get: (reference: TestReference) => Promise<ReturnType<typeof snapshot>>;
        set: typeof transactionSet;
      }) => Promise<void>,
    ) =>
      callback({
        get: async (reference) => {
          if (reference.collectionName === "documents") {
            return snapshot(state.document);
          }
          if (reference.collectionName === "client_cases") {
            return snapshot(state.clientCase);
          }
          if (reference.collectionName === "client_documents") {
            return snapshot(state.operationsDocument);
          }
          return snapshot(null);
        },
        set: transactionSet,
      }),
  }),
}));

const validBody = {
  documentId: "req_case_passport",
  documentType: "passport",
  contentType: "application/pdf",
  size: 1024,
  originalFileName: "passport.pdf",
  safeFileName: "passport.pdf",
  storagePath:
    "users/user-1/documents/req_case_passport-passport.pdf",
};

function uploadRequest(body: unknown = validBody) {
  return new NextRequest("http://localhost/api/client/documents/upload", {
    method: "POST",
    headers: {
      authorization: "Bearer client-token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("requested document upload security", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
    getMetadata.mockReset();
    transactionSet.mockReset();
    verifyIdToken.mockResolvedValue({ uid: "user-1" });
    state.document = {
      ownerId: "user-1",
      caseId: "case-1",
      documentType: "passport",
      status: "requested",
    };
    state.clientCase = { uid: "user-1" };
    state.operationsDocument = null;
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: {
          ownerId: "user-1",
          documentId: "req_case_passport",
        },
      },
    ]);
  });

  it("accepts an existing requested document backed by matching Storage metadata", async () => {
    const response = await POST(uploadRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      matchedRequest: true,
    });
    expect(transactionSet).toHaveBeenCalledTimes(2);
  });

  it("rejects an approved document overwrite", async () => {
    state.document = { ...state.document, status: "approved" };

    const response = await POST(uploadRequest());

    expect(response.status).toBe(409);
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it("does not reveal a document owned by another uid", async () => {
    state.document = { ...state.document, ownerId: "user-2" };

    const response = await POST(uploadRequest());

    expect(response.status).toBe(404);
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it("rejects a missing Storage object", async () => {
    getMetadata.mockRejectedValueOnce(new Error("storage/object-not-found"));

    const response = await POST(uploadRequest());

    expect(response.status).toBe(404);
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it("rejects MIME metadata that differs from the declared upload", async () => {
    getMetadata.mockResolvedValueOnce([
      {
        contentType: "image/png",
        size: "1024",
        metadata: {
          ownerId: "user-1",
          documentId: "req_case_passport",
        },
      },
    ]);

    const response = await POST(uploadRequest());

    expect(response.status).toBe(409);
    expect(transactionSet).not.toHaveBeenCalled();
  });

  it("rejects incomplete upload metadata", async () => {
    const response = await POST(
      uploadRequest({
        documentType: "passport",
        contentType: "application/pdf",
        size: 1024,
      }),
    );

    expect(response.status).toBe(400);
    expect(getMetadata).not.toHaveBeenCalled();
  });
});
