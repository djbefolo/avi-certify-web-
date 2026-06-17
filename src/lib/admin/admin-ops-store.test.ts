import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type {
  AdminClientProfile,
  ClientCase,
  ClientDocument,
  ClientFinancialFile,
} from "@/types/admin-ops";

type AdminOpsTestState = {
  clients: AdminClientProfile[];
  cases: ClientCase[];
  documents: ClientDocument[];
  financialFiles: ClientFinancialFile[];
  payments: Array<Record<string, unknown>>;
  notifications: unknown[];
  events: unknown[];
  communications: unknown[];
};

const timestamp = "2026-06-18T08:00:00.000Z";

const actor = {
  uid: "admin-1",
  email: "admin@avicertify.fr",
  role: "super_admin",
  authProvider: "firebase-session",
} satisfies AdminActor;

function state() {
  return (globalThis as typeof globalThis & {
    __aviAdminOpsState: AdminOpsTestState;
  }).__aviAdminOpsState;
}

function resetState() {
  const nextState = state();

  nextState.clients.length = 0;
  nextState.cases.length = 0;
  nextState.documents.length = 0;
  nextState.financialFiles.length = 0;
  nextState.payments.length = 0;
  nextState.notifications.length = 0;
  nextState.events.length = 0;
  nextState.communications.length = 0;
}

function authOnlyClient(
  overrides: Partial<AdminClientProfile> = {},
): AdminClientProfile {
  return {
    uid: "auth-only-1",
    email: "auth-only@example.com",
    fullName: null,
    phone: null,
    countryOfOrigin: null,
    destinationCountry: null,
    createdAt: timestamp,
    lastLoginAt: null,
    accountStatus: "ACTIVE",
    onboardingStatus: "NOT_STARTED",
    currentCaseId: null,
    tags: ["firebase_auth_sync"],
    priority: "NORMAL",
    assignedAdminId: null,
    source: "firebase_auth_sync",
    updatedAt: timestamp,
    ...overrides,
  };
}

function existingCase(overrides: Partial<ClientCase> = {}): ClientCase {
  return {
    id: "case-existing",
    uid: "auth-only-1",
    caseNumber: "AVI-2026-000001",
    clientEmail: "auth-only@example.com",
    clientName: "auth-only",
    productType: "TO_QUALIFY",
    status: "NEW",
    priority: "NORMAL",
    requestedAmount: null,
    requestedCurrency: null,
    region: null,
    destinationCountry: null,
    destinationSchool: null,
    schoolName: null,
    intakeDate: null,
    paymentStatus: "NOT_STARTED",
    documentStatus: "MISSING",
    financeStatus: "NOT_STARTED",
    certificateStatus: "NOT_STARTED",
    nextAction: "Qualifier la demande client",
    assignedAdminId: null,
    notes: null,
    source: "admin_created",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function uploadedDocument(overrides: Partial<ClientDocument> = {}): ClientDocument {
  return {
    id: "doc-1",
    uid: "auth-only-1",
    caseId: null,
    clientEmail: "auth-only@example.com",
    clientName: null,
    documentType: "passport",
    fileName: "passport.pdf",
    storagePath: "users/auth-only-1/documents/doc-1-passport.pdf",
    mimeType: "application/pdf",
    size: 1024,
    downloadUrl: null,
    uploadStatus: "uploaded",
    uploadedBy: "CLIENT",
    source: "CLIENT",
    verificationStatus: "UPLOADED",
    rejectionReason: null,
    requestedAt: null,
    uploadedAt: timestamp,
    verifiedAt: null,
    verifiedBy: null,
    expiresAt: null,
    isRequired: true,
    deliveryStatus: null,
    ...overrides,
  };
}

function financialFile(
  overrides: Partial<ClientFinancialFile> = {},
): ClientFinancialFile {
  return {
    id: "finance-1",
    uid: "auth-only-1",
    caseId: "case-existing",
    simulationId: "simulation-1",
    quoteId: null,
    reportId: null,
    productCode: "PREFINANCING",
    region: "eu",
    xafAmount: 8_000_000,
    option: null,
    riskTier: null,
    status: "SIMULATED",
    reportStatus: "DRAFT",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

describe("AdminOperationsStore case materialization", () => {
  beforeEach(() => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");
    resetState();
  });

  afterEach(() => {
    resetState();
    vi.unstubAllEnvs();
  });

  it("syncs Firebase Auth fallback profiles without creating operational cases", async () => {
    const result = await getAdminOperationsStore().syncAuthUsers(actor);

    expect(result).toEqual({ synced: 1, created: 1, updated: 0 });
    expect(state().clients).toHaveLength(1);
    expect(state().cases).toHaveLength(0);
  });

  it("does not create a case when reconciling a Firebase Auth-only profile", async () => {
    state().clients.push(authOnlyClient());

    const result = await getAdminOperationsStore().reconcileCases(actor);

    expect(result.casesCreated).toBe(0);
    expect(result.casesUpdated).toBe(0);
    expect(state().cases).toHaveLength(0);
  });

  it("creates a case when a real user profile signal exists", async () => {
    state().clients.push(
      authOnlyClient({
        uid: "profile-1",
        email: "profile@example.com",
        fullName: "Awa Ndiaye",
        phone: "+237699000000",
        countryOfOrigin: "Cameroun",
        destinationCountry: "France",
        tags: [],
        source: "user_profile",
      }),
    );

    const result = await getAdminOperationsStore().reconcileCases(actor);

    expect(result.casesCreated).toBe(1);
    expect(state().cases).toHaveLength(1);
    expect(state().cases[0]).toMatchObject({
      uid: "profile-1",
      source: "client_request",
      productType: "TO_QUALIFY",
    });
  });

  it("creates and links a case when an Auth synced client has an uploaded document", async () => {
    state().clients.push(authOnlyClient());
    state().documents.push(uploadedDocument());

    const result = await getAdminOperationsStore().reconcileCases(actor);

    expect(result.casesCreated).toBe(1);
    expect(result.documentsLinked).toBe(1);
    expect(state().cases).toHaveLength(1);
    expect(state().cases[0].source).toBe("reconciliation");
    expect(state().documents[0].caseId).toBe(state().cases[0].id);
  });

  it("creates a case and maps payment status when a payment signal exists", async () => {
    state().clients.push(authOnlyClient());
    state().payments.push({
      id: "payment-1",
      ownerId: "auth-only-1",
      serviceType: "accommodation_certificate",
      status: "paid",
    });

    const result = await getAdminOperationsStore().reconcileCases(actor);

    expect(result.casesCreated).toBe(1);
    expect(state().cases).toHaveLength(1);
    expect(state().cases[0]).toMatchObject({
      uid: "auth-only-1",
      paymentStatus: "CONFIRMED",
      source: "reconciliation",
    });
  });

  it("preserves and updates existing cases for Auth-only profiles", async () => {
    state().clients.push(authOnlyClient());
    state().cases.push(existingCase());
    state().financialFiles.push(financialFile());

    const result = await getAdminOperationsStore().reconcileCases(actor);

    expect(result.casesCreated).toBe(0);
    expect(result.casesUpdated).toBe(1);
    expect(state().cases).toHaveLength(1);
    expect(state().cases[0]).toMatchObject({
      id: "case-existing",
      financeStatus: "SIMULATED",
    });
  });
});
