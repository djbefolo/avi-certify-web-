import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { ClientDocument } from "@/types/admin-ops";

const firestoreCollections = vi.hoisted(() => ({
  documents: [] as Array<{ id: string; data: Record<string, unknown> }>,
  client_documents: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
  admin_client_profiles: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
  client_cases: [] as Array<{ id: string; data: Record<string, unknown> }>,
  client_financial_files: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
  admin_case_events: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
  communication_logs: [] as Array<{
    id: string;
    data: Record<string, unknown>;
  }>,
  users: [] as Array<{ id: string; data: Record<string, unknown> }>,
  leads: [] as Array<{ id: string; data: Record<string, unknown> }>,
}));

const getUserByEmail = vi.hoisted(() => vi.fn());
const getUsers = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
const getFiles = vi.hoisted(() => vi.fn());
const storageBucketName = "avi-certify-platform.firebasestorage.app";

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ getUserByEmail, getUsers, getUser }),
  getAdminStorage: () => ({
    bucket: () => ({ name: storageBucketName, getFiles }),
  }),
  getAdminFirestore: () => ({
    collection: (name: keyof typeof firestoreCollections) => ({
      get: async () => ({
        docs: (firestoreCollections[name] ?? []).map((item) => ({
          id: item.id,
          data: () => item.data,
        })),
      }),
      doc: (id: string) => ({
        get: async () => {
          const item = (firestoreCollections[name] ?? []).find(
            (candidate) => candidate.id === id,
          );
          return {
            exists: Boolean(item),
            data: () => item?.data,
          };
        },
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

function setOwnerDocument(ownerId = "owner-uid") {
  firestoreCollections.documents = [
    {
      id: "owner-document",
      data: {
        ownerId,
        documentType: "passport",
        status: "uploaded",
        originalFileName: "passport.pdf",
        storagePath: `users/${ownerId}/documents/owner-document-passport.pdf`,
        contentType: "application/pdf",
        size: 1024,
        createdAt: "2026-07-15T11:45:42.827Z",
      },
    },
  ];
  firestoreCollections.client_documents = [];
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
    firestoreCollections.admin_client_profiles = [];
    firestoreCollections.client_cases = [];
    firestoreCollections.client_financial_files = [];
    firestoreCollections.admin_case_events = [];
    firestoreCollections.communication_logs = [];
    firestoreCollections.users = [];
    firestoreCollections.leads = [];
    getUserByEmail.mockReset();
    getUserByEmail.mockResolvedValue({ uid: "client-360-uid" });
    getUsers.mockReset();
    getUsers.mockResolvedValue({ users: [] });
    getUser.mockReset();
    getUser.mockRejectedValue(new Error("User not found"));
    getFiles.mockReset();
    getFiles.mockResolvedValue([[]]);
  });

  afterEach(() => {
    firestoreCollections.documents = [];
    firestoreCollections.client_documents = [];
    firestoreCollections.admin_client_profiles = [];
    firestoreCollections.client_cases = [];
    firestoreCollections.client_financial_files = [];
    firestoreCollections.admin_case_events = [];
    firestoreCollections.communication_logs = [];
    firestoreCollections.users = [];
    firestoreCollections.leads = [];
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

  it("reports the resolved Auth UID and per-source document counts in Client 360", async () => {
    firestoreCollections.admin_client_profiles = [
      {
        id: "client-360-uid",
        data: {
          uid: "client-360-uid",
          email: "client@example.com",
          createdAt: "2026-07-15T08:00:00.000Z",
          updatedAt: "2026-07-15T08:00:00.000Z",
        },
      },
    ];

    const client = await getAdminOperationsStore().getClient360(
      "client-360-uid",
    );

    expect(getUserByEmail).toHaveBeenCalledWith("client@example.com");
    expect(getFiles).toHaveBeenCalledWith({
      prefix: "users/client-360-uid/documents/",
    });
    expect(client.documents).toHaveLength(1);
    expect(client.documentDiagnostics).toMatchObject({
      resolvedUid: "client-360-uid",
      authUid: "client-360-uid",
      firestoreCounts: {
        documents: 1,
        clientDocuments: 1,
      },
      storage: {
        status: "CHECKED",
        fileCount: 0,
        orphanedFileCount: 0,
      },
      message: "Rattachement documentaire vérifié.",
      error: null,
    });
  });

  it("flags Storage files that have no Firestore metadata", async () => {
    firestoreCollections.documents = [];
    firestoreCollections.client_documents = [];
    firestoreCollections.admin_client_profiles = [
      {
        id: "client-360-uid",
        data: {
          uid: "client-360-uid",
          email: "client@example.com",
          createdAt: "2026-07-15T08:00:00.000Z",
          updatedAt: "2026-07-15T08:00:00.000Z",
        },
      },
    ];
    getFiles.mockResolvedValue([
      [
        {
          name: "users/client-360-uid/documents/orphan-passport.pdf",
        },
      ],
    ]);

    const client = await getAdminOperationsStore().getClient360(
      "client-360-uid",
    );

    expect(client.documents).toHaveLength(0);
    expect(client.documentDiagnostics.storage).toEqual({
      status: "CHECKED",
      bucketName: storageBucketName,
      fileCount: 1,
      orphanedFileCount: 1,
    });
    expect(client.documentDiagnostics.message).toBe(
      "Fichiers détectés dans Storage sans métadonnées Firestore.",
    );
  });

  it("resolves a document owner from admin_client_profiles by UID", async () => {
    setOwnerDocument();
    firestoreCollections.admin_client_profiles = [
      {
        id: "owner-uid",
        data: {
          uid: "owner-uid",
          fullName: "Client Admin",
          email: "admin-client@example.com",
        },
      },
    ];

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.ownerResolution).toMatchObject({
      source: "admin_client_profile",
      fullName: "Client Admin",
      email: "admin-client@example.com",
      status: "RESOLVED",
      canOpenClient360: true,
    });
  });

  it("resolves a document owner from users by UID", async () => {
    setOwnerDocument();
    firestoreCollections.users = [
      {
        id: "owner-uid",
        data: {
          fullName: "Bijou Ngonga",
          email: "sylvainmujidila@yahoo.com",
          phone: "+33605701368",
        },
      },
    ];

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.ownerResolution).toMatchObject({
      source: "users",
      fullName: "Bijou Ngonga",
      email: "sylvainmujidila@yahoo.com",
      phone: "+33605701368",
      status: "PROFILE_SYNC_REQUIRED",
      canOpenClient360: true,
    });
  });

  it("resolves a document owner from Firebase Auth by UID", async () => {
    setOwnerDocument();
    getUsers.mockResolvedValue({
      users: [
        {
          uid: "owner-uid",
          email: "auth-client@example.com",
          displayName: "Client Auth",
          disabled: false,
          metadata: {},
        },
      ],
    });

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.ownerResolution).toMatchObject({
      source: "auth",
      fullName: "Client Auth",
      email: "auth-client@example.com",
      status: "PROFILE_SYNC_REQUIRED",
      canOpenClient360: true,
    });
  });

  it("resolves a lead by the email obtained from Firebase Auth", async () => {
    setOwnerDocument();
    getUsers.mockResolvedValue({
      users: [
        {
          uid: "owner-uid",
          email: "lead@example.com",
          disabled: false,
          metadata: {},
        },
      ],
    });
    firestoreCollections.leads = [
      {
        id: "lead-1",
        data: {
          fullName: "Client Prospect",
          email: "lead@example.com",
          phone: "+33600000000",
        },
      },
    ];

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.ownerResolution).toMatchObject({
      source: "lead_match",
      fullName: "Client Prospect",
      email: "lead@example.com",
      leadId: "lead-1",
      status: "LEAD_NOT_CONVERTED",
      canOpenClient360: true,
    });
  });

  it("keeps an unresolved owner explicit without hiding document access", async () => {
    setOwnerDocument();

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.storagePath).toContain("users/owner-uid/documents/");
    expect(document.ownerResolution).toMatchObject({
      source: "unresolved",
      status: "UNRESOLVED",
      canOpenClient360: false,
    });
  });

  it("warns instead of silently merging multiple lead identities", async () => {
    setOwnerDocument();
    getUsers.mockResolvedValue({
      users: [
        {
          uid: "owner-uid",
          email: "shared@example.com",
          disabled: false,
          metadata: {},
        },
      ],
    });
    firestoreCollections.leads = [
      { id: "lead-1", data: { fullName: "Lead One", email: "shared@example.com" } },
      { id: "lead-2", data: { fullName: "Lead Two", email: "shared@example.com" } },
    ];

    const [document] =
      await getAdminOperationsStore().listDocumentsWithOwners();

    expect(document.ownerResolution?.warning).toContain(
      "Plusieurs prospects",
    );
    expect(document.ownerResolution?.leadId).toBe("lead-1");
  });

  it("opens a non-persisted Client 360 profile from users and shows owner documents", async () => {
    setOwnerDocument("owner-uid");
    firestoreCollections.users = [
      {
        id: "owner-uid",
        data: {
          fullName: "Bijou Ngonga",
          email: "sylvainmujidila@yahoo.com",
          phone: "+33605701368",
          createdAt: "2026-07-15T11:40:19.051Z",
        },
      },
    ];
    getUserByEmail.mockResolvedValue({ uid: "owner-uid" });
    getFiles.mockResolvedValue([
      [
        {
          name: "users/owner-uid/documents/owner-document-passport.pdf",
        },
      ],
    ]);

    const client = await getAdminOperationsStore().getClient360("owner-uid");

    expect(client.profile).toMatchObject({
      uid: "owner-uid",
      fullName: "Bijou Ngonga",
      email: "sylvainmujidila@yahoo.com",
      source: "user_profile",
    });
    expect(client.cases).toHaveLength(0);
    expect(client.documents).toHaveLength(1);
    expect(client.documentDiagnostics).toMatchObject({
      authUid: "owner-uid",
      firestoreCounts: { documents: 1, clientDocuments: 0 },
      storage: { fileCount: 1, orphanedFileCount: 0 },
    });
  });
});
