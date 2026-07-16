import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminDocumentServiceError,
  getAdminDocumentById,
} from "@/lib/documents/admin-document.service";

const records = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  client_documents: new Map<string, Record<string, unknown>>(),
  client_cases: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    collection: (name: keyof typeof records) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = records[name].get(id);
          return {
            exists: Boolean(data),
            data: () => data,
          };
        },
      }),
    }),
  }),
}));

const publicDocument = {
  ownerId: "client-1",
  caseId: "case-1",
  documentType: "passport",
  status: "uploaded",
  originalFileName: "passport.pdf",
  storagePath: "users/client-1/documents/doc-1-passport.pdf",
  contentType: "application/pdf",
  size: 1024,
};

describe("admin document ownership resolution", () => {
  beforeEach(() => {
    records.documents.clear();
    records.client_documents.clear();
    records.client_cases.clear();
    records.documents.set("doc-1", publicDocument);
  });

  it("accepts a document whose case belongs to the same client uid", async () => {
    records.client_cases.set("case-1", { uid: "client-1" });

    await expect(getAdminDocumentById("doc-1")).resolves.toMatchObject({
      id: "doc-1",
      uid: "client-1",
      caseId: "case-1",
      verificationStatus: "UPLOADED",
    });
  });

  it("rejects a document attached to a case owned by another client", async () => {
    records.client_cases.set("case-1", { uid: "client-2" });

    await expect(getAdminDocumentById("doc-1")).rejects.toMatchObject({
      status: 409,
      message: "Document case ownership metadata is inconsistent.",
    } satisfies Partial<AdminDocumentServiceError>);
  });
});
