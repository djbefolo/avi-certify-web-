import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { ClientDocument } from "@/types/admin-ops";

const firestoreCollections = vi.hoisted(() => ({
  documents: [] as Array<{ id: string; data: Record<string, unknown> }>,
  client_documents: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: vi.fn(),
  getAdminFirestore: () => ({
    collection: (name: keyof typeof firestoreCollections) => ({
      get: async () => ({
        docs: (firestoreCollections[name] ?? []).map((item) => ({
          id: item.id,
          data: () => item.data,
        })),
      }),
    }),
  }),
}));

function operationsDocument(
  overrides: Partial<ClientDocument> = {},
): ClientDocument {
  return {
    id: "visible-doc",
    uid: "client-360-uid",
    caseId: null,
    documentType: "passport",
    fileName: "Passeport demandé",
    storagePath: "",
    mimeType: null,
    size: null,
    downloadUrl: null,
    uploadStatus: "requested",
    uploadedBy: "SYSTEM",
    source: "SYSTEM",
    verificationStatus: "REQUESTED",
    rejectionReason: null,
    requestedAt: "2026-07-15T08:00:00.000Z",
    uploadedAt: null,
    verifiedAt: null,
    verifiedBy: null,
    isRequired: true,
    ...overrides,
  };
}

describe("AdminOperationsStore document visibility", () => {
  beforeEach(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "test-project");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "admin@example.com");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "test-key");
    firestoreCollections.documents = Array.from({ length: 200 }, (_, index) => ({
      id: `filler-${index}`,
      data: {
        ownerId: `client-${index}`,
        documentType: "passport",
        status: "uploaded",
        originalFileName: `passport-${index}.pdf`,
        storagePath: `users/client-${index}/documents/filler-${index}-passport.pdf`,
        contentType: "application/pdf",
        size: 1024,
        createdAt: "2026-07-14T08:00:00.000Z",
      },
    }));
    firestoreCollections.documents.push({
      id: "visible-doc",
      data: {
        ownerId: "client-360-uid",
        documentType: "passport",
        status: "uploaded",
        originalFileName: "passeport-client.pdf",
        storagePath:
          "users/client-360-uid/documents/visible-doc-passeport-client.pdf",
        contentType: "application/pdf",
        size: 2048,
        createdAt: "2026-07-16T08:00:00.000Z",
      },
    });
    firestoreCollections.client_documents = [
      { id: "visible-doc", data: operationsDocument() },
    ];
  });

  afterEach(() => {
    firestoreCollections.documents = [];
    firestoreCollections.client_documents = [];
    vi.unstubAllEnvs();
  });

  it("returns documents beyond the former 200-row cap and preserves uploaded file metadata", async () => {
    const documents = await getAdminOperationsStore().listDocuments();
    const visibleDocument = documents.find(
      (document) => document.id === "visible-doc",
    );

    expect(documents).toHaveLength(201);
    expect(visibleDocument).toMatchObject({
      uid: "client-360-uid",
      fileName: "Passeport demandé",
      storagePath:
        "users/client-360-uid/documents/visible-doc-passeport-client.pdf",
      mimeType: "application/pdf",
      size: 2048,
      verificationStatus: "UPLOADED",
      uploadedAt: "2026-07-16T08:00:00.000Z",
    });
  });
});
