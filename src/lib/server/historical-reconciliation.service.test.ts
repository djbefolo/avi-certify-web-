import { beforeEach, describe, expect, it, vi } from "vitest";

type Stored = Record<string, unknown>;
type Ref = { kind: "doc"; collection: string; id: string };
type Query = { kind: "query"; collection: string; field?: string; value?: unknown; limitCount?: number; cursor?: string | null };
type TransactionMock = {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => {
  const documents = new Map<string, Stored>();
  const writes = vi.fn();
  const auth = { getUserByEmail: vi.fn() };
  const path = (collection: string, id: string) => `${collection}/${id}`;
  const ref = (collection: string, id: string): Ref => ({ kind: "doc", collection, id });
  const snapshot = (document: Ref) => {
    const data = documents.get(path(document.collection, document.id));
    return { exists: Boolean(data), id: document.id, data: () => data, get: (field: string) => data?.[field] };
  };
  const querySnapshot = (query: Query) => {
    const prefix = `${query.collection}/`;
    const records = [...documents.entries()]
      .filter(([key, data]) => key.startsWith(prefix) && (query.field == null || data[query.field] === query.value))
      .map(([key]) => key.slice(prefix.length))
      .sort()
      .filter((id) => !query.cursor || id > query.cursor);
    const limited = records.slice(0, query.limitCount ?? records.length);
    return { size: limited.length, docs: limited.map((id) => ({ ...snapshot(ref(query.collection, id)), ref: ref(query.collection, id) })) };
  };
  const transaction = () => ({
    get: vi.fn(async (target: Ref | Query) => target.kind === "doc" ? snapshot(target) : querySnapshot(target)),
    set: vi.fn((target: Ref, data: Stored, options?: { merge?: boolean }) => { writes(); const key = path(target.collection, target.id); documents.set(key, options?.merge ? { ...(documents.get(key) ?? {}), ...data } : data); }),
    create: vi.fn((target: Ref, data: Stored) => { writes(); documents.set(path(target.collection, target.id), data); }),
  });
  const collection = (name: string) => ({
    doc: (id: string) => ({ ...ref(name, id), get: async () => snapshot(ref(name, id)) }),
    where: (field: string, _operator: string, value: unknown) => ({ limit: (limitCount: number) => ({ kind: "query" as const, collection: name, field, value, limitCount, get: async () => querySnapshot({ kind: "query", collection: name, field, value, limitCount }) }) }),
    orderBy: () => ({ limit: (limitCount: number) => ({ kind: "query" as const, collection: name, limitCount, startAfter(cursor: string) { return { ...this, cursor }; }, get: async () => querySnapshot({ kind: "query", collection: name, limitCount }) }) }),
  });
  return {
    documents, writes, auth,
    db: { collection, runTransaction: async <T>(callback: (transaction: TransactionMock) => Promise<T>) => callback(transaction()) },
    reset: () => { documents.clear(); writes.mockClear(); auth.getUserByEmail.mockReset(); },
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
  FieldValue: { serverTimestamp: () => "server-timestamp" },
}));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => mocks.db,
  getAdminAuth: () => mocks.auth,
}));

import {
  applySafeHistoricalLeadReconciliation,
  buildHistoricalReconciliationPlan,
} from "@/lib/server/historical-reconciliation.service";

function lead(id: string, values: Stored = {}) {
  mocks.documents.set(`leads/${id}`, { id, email: "prospect@example.com", normalizedEmail: "prospect@example.com", crmStatus: "NEW", ...values });
}

beforeEach(() => mocks.reset());

describe("historical reconciliation dry-run", () => {
  it("reads and classifies an already linked lead without any write", async () => {
    lead("lead-1", { linkedUid: "uid-1", identityLinkStatus: "LINKED" });
    const plan = await buildHistoricalReconciliationPlan();
    expect(plan.counts.ALREADY_CORRECT).toBe(1);
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("proposes only a canonical Lead to UID link for one verified identity", async () => {
    lead("lead-1");
    mocks.auth.getUserByEmail.mockResolvedValue({ uid: "uid-1", emailVerified: true });
    const plan = await buildHistoricalReconciliationPlan();
    expect(plan.items[0]).toMatchObject({ classification: "SAFE_AUTO_RECONCILABLE", relatedEntities: { uid: "uid-1" } });
    expect(plan.items[0].proposedChanges.map((change) => change.field)).toEqual(["linkedUid", "identityLinkStatus", "linkMethod"]);
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("blocks multiple historical leads sharing the verified email", async () => {
    lead("lead-1");
    lead("lead-2");
    mocks.auth.getUserByEmail.mockResolvedValue({ uid: "uid-1", emailVerified: true });
    const plan = await buildHistoricalReconciliationPlan();
    expect(plan.counts.AMBIGUOUS).toBe(2);
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("does not treat an unverified account, a profile, or a payment as automatic identity proof", async () => {
    lead("lead-1");
    mocks.documents.set("admin_client_profiles/uid-1", { uid: "uid-1", clientStatus: "CLIENT" });
    mocks.documents.set("payments/payment-1", { ownerId: "uid-1", status: "paid" });
    mocks.auth.getUserByEmail.mockResolvedValue({ uid: "uid-1", emailVerified: false });
    const plan = await buildHistoricalReconciliationPlan();
    expect(plan.items[0].classification).toBe("MANUAL_REVIEW");
    expect(mocks.writes).not.toHaveBeenCalled();
  });

  it("keeps missing identity evidence insufficient", async () => {
    lead("lead-1", { email: null, normalizedEmail: null });
    const plan = await buildHistoricalReconciliationPlan();
    expect(plan.items[0].classification).toBe("INSUFFICIENT_DATA");
    expect(mocks.writes).not.toHaveBeenCalled();
  });
});

describe("historical reconciliation apply engine", () => {
  it("applies a safe link once with one immutable audit event and is idempotent", async () => {
    lead("lead-1");
    mocks.auth.getUserByEmail.mockResolvedValue({ uid: "uid-1", emailVerified: true });
    const first = await applySafeHistoricalLeadReconciliation({ leadIds: ["lead-1"], runId: "run-1" });
    const second = await applySafeHistoricalLeadReconciliation({ leadIds: ["lead-1"], runId: "run-1" });
    expect(first).toMatchObject({ applied: 1, skipped: 0 });
    expect(second).toMatchObject({ applied: 0, skipped: 1 });
    expect(mocks.documents.get("leads/lead-1")).toMatchObject({ linkedUid: "uid-1", identityLinkStatus: "LINKED", linkMethod: "HISTORICAL_RECONCILIATION" });
    expect([...mocks.documents.keys()].filter((key) => key.startsWith("admin_case_events/"))).toHaveLength(1);
  });

  it("never applies an ambiguous relationship", async () => {
    lead("lead-1"); lead("lead-2");
    mocks.auth.getUserByEmail.mockResolvedValue({ uid: "uid-1", emailVerified: true });
    const result = await applySafeHistoricalLeadReconciliation({ leadIds: ["lead-1"], runId: "run-1" });
    expect(result).toMatchObject({ applied: 0, skipped: 1 });
    expect([...mocks.documents.keys()].filter((key) => key.startsWith("admin_case_events/"))).toHaveLength(0);
  });
});
