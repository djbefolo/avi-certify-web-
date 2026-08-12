import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDocument = Record<string, unknown>;
type DocumentReference = { kind: "document"; id: string; path: string };
type QueryReference = {
  kind: "query";
  collectionName: string;
  field: string;
  value: unknown;
  limitCount: number;
};

const firestoreMocks = vi.hoisted(() => {
  const documents = new Map<string, StoredDocument>();
  let transactionChain: Promise<unknown> = Promise.resolve();

  function documentReference(collectionName: string, id: string): DocumentReference {
    return { kind: "document", id, path: `${collectionName}/${id}` };
  }

  function documentSnapshot(reference: DocumentReference) {
    const data = documents.get(reference.path);
    return {
      exists: Boolean(data),
      id: reference.id,
      ref: reference,
      data: () => data,
      get: (field: string) => data?.[field],
    };
  }

  function querySnapshot(reference: QueryReference) {
    const prefix = `${reference.collectionName}/`;
    return {
      docs: [...documents.entries()]
        .filter(([path, data]) => path.startsWith(prefix) && data[reference.field] === reference.value)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, reference.limitCount)
        .map(([path]) => documentSnapshot(documentReference(reference.collectionName, path.slice(prefix.length)))),
    };
  }

  function transaction() {
    return {
      get: vi.fn(async (reference: DocumentReference | QueryReference) =>
        reference.kind === "query" ? querySnapshot(reference) : documentSnapshot(reference),
      ),
      set: vi.fn((reference: DocumentReference, data: StoredDocument, options?: { merge?: boolean }) => {
        const existing = documents.get(reference.path) ?? {};
        documents.set(reference.path, options?.merge ? { ...existing, ...data } : { ...data });
      }),
      create: vi.fn((reference: DocumentReference, data: StoredDocument) => {
        if (documents.has(reference.path)) throw new Error(`Document already exists: ${reference.path}`);
        documents.set(reference.path, { ...data });
      }),
    };
  }

  const collection = vi.fn((collectionName: string) => ({
    doc: (id: string) => documentReference(collectionName, id),
    where: (field: string, _operator: string, value: unknown) => ({
      limit: (limitCount: number): QueryReference => ({ kind: "query", collectionName, field, value, limitCount }),
    }),
  }));
  const db = {
    collection,
    runTransaction: vi.fn(<T>(callback: (value: unknown) => Promise<T>) => {
      const result = transactionChain.then(() => callback(transaction()));
      transactionChain = result.then(() => undefined, () => undefined);
      return result;
    }),
  };

  return {
    documents,
    collection,
    db,
    getAdminFirestore: vi.fn(() => db),
    reset: () => {
      documents.clear();
      transactionChain = Promise.resolve();
      collection.mockClear();
      db.runTransaction.mockClear();
    },
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "server-timestamp") },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

import { convertLeadFromConfirmedPayment } from "@/lib/server/lead-client-conversion.service";

function setDocument(path: string, data: StoredDocument) {
  firestoreMocks.documents.set(path, structuredClone(data));
}

function payment(id: string, overrides: StoredDocument = {}) {
  setDocument(`payments/${id}`, {
    ownerId: "uid-1",
    status: "paid",
    serviceType: "accommodation_certificate",
    ...overrides,
  });
}

function linkedLead(id = "lead-1", overrides: StoredDocument = {}) {
  setDocument(`leads/${id}`, {
    linkedUid: "uid-1",
    identityLinkStatus: "LINKED",
    crmStatus: "QUALIFIED",
    fullName: "Awa Prospect",
    email: "awa@example.com",
    phone: "+237600000000",
    residenceCountry: "Cameroun",
    destinationCountry: "France",
    marketingConsent: false,
    ...overrides,
  });
}

function convert(paymentId = "payment-1") {
  return convertLeadFromConfirmedPayment({
    paymentId,
    ownerId: "uid-1",
    serviceType: "accommodation_certificate",
    caseId: "case-1",
  });
}

beforeEach(() => firestoreMocks.reset());

describe("canonical lead to client conversion", () => {
  it("converts one securely linked lead only after a canonical paid payment", async () => {
    payment("payment-1");
    linkedLead();

    await expect(convert()).resolves.toMatchObject({
      status: "CONVERTED",
      leadId: "lead-1",
      clientId: "uid-1",
      clientCreated: true,
      caseId: "case-1",
    });

    expect(firestoreMocks.documents.get("leads/lead-1")).toMatchObject({
      crmStatus: "CONVERTED",
      clientId: "uid-1",
      conversionReason: "PAYMENT_CONFIRMED",
      conversionSource: "STRIPE_WEBHOOK",
      conversionReference: "payment-1",
      marketingConsent: false,
    });
    expect(firestoreMocks.documents.get("admin_client_profiles/uid-1")).toMatchObject({
      uid: "uid-1",
      clientStatus: "CLIENT",
      originLeadId: "lead-1",
      conversionReference: "payment-1",
    });
    expect([...firestoreMocks.documents.keys()].filter((path) => path.startsWith("admin_case_events/"))).toHaveLength(1);
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
  });

  it("is idempotent for the same payment reference", async () => {
    payment("payment-1");
    linkedLead();

    await expect(convert()).resolves.toMatchObject({ status: "CONVERTED" });
    await expect(convert()).resolves.toMatchObject({ status: "ALREADY_CONVERTED" });

    expect([...firestoreMocks.documents.keys()].filter((path) => path.startsWith("admin_client_profiles/"))).toHaveLength(1);
    expect([...firestoreMocks.documents.keys()].filter((path) => path.startsWith("admin_case_events/"))).toHaveLength(1);
  });

  it("serializes concurrent delivery of the same payment trigger", async () => {
    payment("payment-1");
    linkedLead();

    const results = await Promise.all([convert(), convert()]);

    expect(results.map((item) => item.status).sort()).toEqual(["ALREADY_CONVERTED", "CONVERTED"]);
    expect([...firestoreMocks.documents.keys()].filter((path) => path.startsWith("admin_case_events/"))).toHaveLength(1);
  });

  it("reuses an existing client for a later valid service payment", async () => {
    payment("payment-2", { serviceType: "visa_support" });
    linkedLead();
    setDocument("admin_client_profiles/uid-1", {
      uid: "uid-1",
      source: "user_profile",
      clientStatus: "CLIENT",
      originLeadId: "lead-original",
      createdAt: "preserved",
    });

    await expect(
      convertLeadFromConfirmedPayment({
        paymentId: "payment-2",
        ownerId: "uid-1",
        serviceType: "visa_support",
      }),
    ).resolves.toMatchObject({ status: "CONVERTED", clientCreated: false });
    expect(firestoreMocks.documents.get("admin_client_profiles/uid-1")).toMatchObject({
      originLeadId: "lead-original",
      clientStatus: "CLIENT",
      conversionReference: "payment-2",
    });
  });

  it("never converts an unpaid or mismatched payment", async () => {
    payment("payment-1", { status: "pending" });
    linkedLead();

    await expect(convert()).resolves.toMatchObject({ status: "INVALID_TRIGGER" });
    expect(firestoreMocks.documents.get("leads/lead-1")).toMatchObject({ crmStatus: "QUALIFIED" });
    expect([...firestoreMocks.documents.keys()].some((path) => path.startsWith("admin_client_profiles/"))).toBe(false);
  });

  it("blocks a paid payment without one safe linked lead and creates one review notification", async () => {
    payment("payment-1");

    await expect(convert()).resolves.toMatchObject({
      status: "MISSING_LINKED_LEAD",
      notificationId: expect.stringMatching(/^lead_conversion_review_/),
    });
    await expect(convert()).resolves.toMatchObject({ status: "MISSING_LINKED_LEAD" });

    expect([...firestoreMocks.documents.keys()].filter((path) => path.startsWith("admin_notifications/"))).toHaveLength(1);
    expect([...firestoreMocks.documents.keys()].some((path) => path.startsWith("admin_client_profiles/"))).toBe(false);
  });

  it("blocks ambiguous linked leads instead of selecting a person", async () => {
    payment("payment-1");
    linkedLead("lead-1");
    linkedLead("lead-2");

    await expect(convert()).resolves.toMatchObject({ status: "AMBIGUOUS_IDENTITY" });
    expect(firestoreMocks.documents.get("leads/lead-1")).toMatchObject({ crmStatus: "QUALIFIED" });
    expect(firestoreMocks.documents.get("leads/lead-2")).toMatchObject({ crmStatus: "QUALIFIED" });
  });

  it("blocks an explicit identity conflict even when a payment is paid", async () => {
    payment("payment-1");
    linkedLead("lead-1", { identityLinkStatus: "CONFLICT" });

    await expect(convert()).resolves.toMatchObject({
      status: "IDENTITY_CONFLICT",
      leadId: "lead-1",
      notificationId: expect.stringMatching(/^lead_conversion_review_/),
    });
    expect(firestoreMocks.documents.get("leads/lead-1")).toMatchObject({
      crmStatus: "QUALIFIED",
      identityLinkStatus: "CONFLICT",
    });
    expect([...firestoreMocks.documents.keys()].some((path) => path.startsWith("admin_client_profiles/"))).toBe(false);
  });
});
