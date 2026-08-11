import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HUMAN_FOLLOW_UP_ADMIN_SOURCE,
  HUMAN_FOLLOW_UP_REASON,
  HUMAN_FOLLOW_UP_SOURCE,
  humanFollowUpEscalationEventId,
  humanFollowUpNotificationId,
  humanFollowUpResolutionEventId,
} from "@/lib/server/onboarding-human-followup.model";
import {
  PROFILE_REMINDER_TEMPLATE,
  profileReminderCommunicationId,
} from "@/lib/server/onboarding-profile-reminder.model";

type StoredDocument = Record<string, unknown>;
type DocumentReference = {
  kind: "document";
  id: string;
  path: string;
};
type Filter = { field: string; operator: string; value: unknown };
type DocumentSnapshot = {
  id: string;
  ref: DocumentReference;
  exists: boolean;
  data: () => StoredDocument | undefined;
  get: (field: string) => unknown;
};
type QueryReference = {
  kind: "query";
  collectionName: string;
  filters: Filter[];
  orderField: string | null;
  limitCount: number;
  where: (field: string, operator: string, value: unknown) => QueryReference;
  orderBy: (field: string) => QueryReference;
  limit: (count: number) => QueryReference;
  get: () => Promise<{ docs: DocumentSnapshot[] }>;
};

const followUpMocks = vi.hoisted(() => {
  const documents = new Map<string, StoredDocument>();
  const limitCalls: number[] = [];
  let transactionChain: Promise<unknown> = Promise.resolve();

  function documentReference(collectionName: string, id: string): DocumentReference {
    return { kind: "document", id, path: `${collectionName}/${id}` };
  }

  function snapshot(reference: DocumentReference): DocumentSnapshot {
    const data = documents.get(reference.path);
    return {
      id: reference.id,
      ref: reference,
      exists: Boolean(data),
      data: () => data,
      get: (field: string) => data?.[field],
    };
  }

  function matchesFilter(data: StoredDocument, filter: Filter) {
    const actual = data[filter.field];
    if (filter.operator === "==") return actual === filter.value;
    if (filter.operator === "<=") {
      return actual instanceof Date && filter.value instanceof Date
        ? actual.getTime() <= filter.value.getTime()
        : false;
    }
    return false;
  }

  function queryReference(
    collectionName: string,
    filters: Filter[] = [],
    orderField: string | null = null,
    limitCount = 100,
  ): QueryReference {
    const reference = {
      kind: "query" as const,
      collectionName,
      filters,
      orderField,
      limitCount,
      where: (field: string, operator: string, value: unknown) =>
        queryReference(collectionName, [...filters, { field, operator, value }], orderField, limitCount),
      orderBy: (field: string) =>
        queryReference(collectionName, filters, field, limitCount),
      limit: (count: number) => {
        limitCalls.push(count);
        return queryReference(collectionName, filters, orderField, count);
      },
      get: async () => querySnapshot(reference),
    };
    return reference;
  }

  function querySnapshot(reference: QueryReference) {
    const prefix = `${reference.collectionName}/`;
    let matching = [...documents.entries()]
      .filter(
        ([path, data]) =>
          path.startsWith(prefix) &&
          reference.filters.every((filter) => matchesFilter(data, filter)),
      );

    if (reference.orderField) {
      matching = matching.sort(([, left], [, right]) => {
        const leftValue = left[reference.orderField!];
        const rightValue = right[reference.orderField!];
        const leftTime = leftValue instanceof Date ? leftValue.getTime() : 0;
        const rightTime = rightValue instanceof Date ? rightValue.getTime() : 0;
        return leftTime - rightTime;
      });
    }

    return {
      docs: matching.slice(0, reference.limitCount).map(([path]) =>
        snapshot(documentReference(reference.collectionName, path.slice(prefix.length))),
      ),
    };
  }

  function transaction() {
    return {
      get: vi.fn(async (reference: DocumentReference | QueryReference) =>
        reference.kind === "query"
          ? querySnapshot(reference)
          : snapshot(reference),
      ),
      set: vi.fn(
        (reference: DocumentReference, data: StoredDocument, options?: { merge?: boolean }) => {
          const existing = documents.get(reference.path) ?? {};
          documents.set(reference.path, options?.merge ? { ...existing, ...data } : { ...data });
        },
      ),
      create: vi.fn((reference: DocumentReference, data: StoredDocument) => {
        if (documents.has(reference.path)) throw new Error(`duplicate ${reference.path}`);
        documents.set(reference.path, { ...data });
      }),
    };
  }

  const collection = vi.fn((collectionName: string) => ({
    doc: (id: string) => documentReference(collectionName, id),
    where: (field: string, operator: string, value: unknown) =>
      queryReference(collectionName).where(field, operator, value),
  }));
  const db = {
    collection,
    runTransaction: vi.fn(<T>(callback: (tx: ReturnType<typeof transaction>) => Promise<T>) => {
      const result = transactionChain.then(() => callback(transaction()));
      transactionChain = result.then(() => undefined, () => undefined);
      return result;
    }),
  };

  return {
    documents,
    limitCalls,
    db,
    collection,
    getUser: vi.fn(),
    serverTimestamp: vi.fn(() => new Date("2026-08-11T09:00:00.000Z")),
    reset: () => {
      documents.clear();
      limitCalls.length = 0;
      transactionChain = Promise.resolve();
    },
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: followUpMocks.serverTimestamp },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => followUpMocks.db,
  getAdminAuth: () => ({ getUser: followUpMocks.getUser }),
}));

import { processOnboardingHumanFollowUps } from "@/lib/server/onboarding-human-followup.service";

const now = new Date("2026-08-11T09:00:00.000Z");
const sentAt = new Date("2026-08-08T09:00:00.000Z");

function incompleteUser(overrides: StoredDocument = {}) {
  return {
    uid: "user-1",
    email: "awa@example.com",
    status: "active",
    emailVerifiedAt: sentAt,
    firstName: "Awa",
    lastName: "Ndiaye",
    birthDate: "1998-05-06",
    birthCountry: "SN",
    nationality: "Sénégalaise",
    countryOfResidence: "SN",
    destinationCountry: "FR",
    destinationCity: "Paris",
    targetSchoolName: "Université",
    intendedProgram: null,
    intendedAcademicYear: "2026-2027",
    intendedArrivalDate: "2026-09-01",
    selectedService: "avi",
    ...overrides,
  };
}

function reminder(uid = "user-1", overrides: StoredDocument = {}) {
  return {
    id: profileReminderCommunicationId(uid),
    uid,
    template: PROFILE_REMINDER_TEMPLATE,
    recipient: "awa@example.com",
    status: "SENT",
    sentAt,
    humanFollowUpStatus: "PENDING",
    humanFollowUpDueAt: now,
    ...overrides,
  };
}

function linkedLead(uid = "user-1", overrides: StoredDocument = {}) {
  return {
    id: "lead-1",
    email: "awa@example.com",
    normalizedEmail: "awa@example.com",
    linkedUid: uid,
    identityLinkStatus: "LINKED",
    crmStatus: "NEW",
    crmPriority: "high",
    crmOwner: "admin-existing",
    marketingConsent: false,
    nextAction: "NONE",
    ...overrides,
  };
}

function seed(options: {
  user?: StoredDocument | null;
  reminder?: StoredDocument;
  leads?: Array<{ id: string; data: StoredDocument }>;
} = {}) {
  if (options.user !== null) {
    followUpMocks.documents.set("users/user-1", options.user ?? incompleteUser());
  }
  followUpMocks.documents.set(
    `communication_logs/${profileReminderCommunicationId("user-1")}`,
    options.reminder ?? reminder(),
  );
  for (const lead of options.leads ?? [{ id: "lead-1", data: linkedLead() }]) {
    followUpMocks.documents.set(`leads/${lead.id}`, lead.data);
  }
}

function get(path: string) {
  return followUpMocks.documents.get(path);
}

beforeEach(() => {
  followUpMocks.reset();
  followUpMocks.collection.mockClear();
  followUpMocks.getUser.mockReset();
  followUpMocks.serverTimestamp.mockClear();
  followUpMocks.getUser.mockResolvedValue({
    uid: "user-1",
    email: "awa@example.com",
    emailVerified: true,
    disabled: false,
  });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("onboarding human follow-up worker", () => {
  it("assigns a system FOLLOW_UP to one safely linked lead", async () => {
    seed();
    const summary = await processOnboardingHumanFollowUps({ now });

    expect(summary.escalated).toBe(1);
    expect(get("leads/lead-1")).toMatchObject({
      nextAction: "FOLLOW_UP",
      followUpReason: HUMAN_FOLLOW_UP_REASON,
      nextActionSource: HUMAN_FOLLOW_UP_SOURCE,
    });
  });

  it("preserves crm status, owner, priority and consent", async () => {
    seed();
    await processOnboardingHumanFollowUps({ now });
    expect(get("leads/lead-1")).toMatchObject({
      crmStatus: "NEW",
      crmOwner: "admin-existing",
      crmPriority: "high",
      marketingConsent: false,
    });
  });

  it("creates one deterministic admin notification and audit event", async () => {
    seed();
    await processOnboardingHumanFollowUps({ now });
    expect(get(`admin_notifications/${humanFollowUpNotificationId("user-1")}`)).toMatchObject({
      relatedUid: "user-1",
      read: false,
      resolved: false,
    });
    expect(get(`admin_case_events/${humanFollowUpEscalationEventId("user-1")}`)).toMatchObject({
      eventType: "profile_human_followup_escalated",
    });
  });

  it("marks the reminder active and removes it from the due query", async () => {
    seed();
    await processOnboardingHumanFollowUps({ now });
    expect(get(`communication_logs/${profileReminderCommunicationId("user-1")}`)).toMatchObject({
      humanFollowUpStatus: "ACTIVE",
      humanFollowUpDueAt: null,
      humanFollowUpLeadId: "lead-1",
    });
  });

  it("is idempotent across a second worker execution", async () => {
    seed();
    await processOnboardingHumanFollowUps({ now });
    const second = await processOnboardingHumanFollowUps({ now });
    expect(second.escalated).toBe(0);
    expect([...followUpMocks.documents.keys()].filter((path) => path.startsWith("admin_notifications/"))).toHaveLength(1);
    expect([...followUpMocks.documents.keys()].filter((path) => path.includes("escalated_user-1"))).toHaveLength(1);
  });

  it("preserves a human-owned next action", async () => {
    seed({ leads: [{ id: "lead-1", data: linkedLead("user-1", { nextAction: "CALL_PROSPECT", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE }) }] });
    await processOnboardingHumanFollowUps({ now });
    expect(get("leads/lead-1")).toMatchObject({
      nextAction: "CALL_PROSPECT",
      nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE,
    });
  });

  it("does not fabricate a lead when no lead exists", async () => {
    seed({ leads: [] });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.reviewRequired).toBe(1);
    expect([...followUpMocks.documents.keys()].filter((path) => path.startsWith("leads/"))).toHaveLength(0);
  });

  it.each([
    ["AMBIGUOUS", { linkedUid: "user-1", identityLinkStatus: "AMBIGUOUS" }],
    ["CONFLICT", { linkedUid: "other-user", identityLinkStatus: "LINKED" }],
  ])("does not mutate a %s identity lead", async (_label, identity) => {
    seed({ leads: [{ id: "lead-1", data: linkedLead("user-1", identity) }] });
    const before = structuredClone(get("leads/lead-1"));
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.reviewRequired).toBe(1);
    expect(get("leads/lead-1")).toEqual(before);
  });

  it("does not choose among multiple candidate leads", async () => {
    seed({ leads: [
      { id: "lead-1", data: linkedLead() },
      { id: "lead-2", data: linkedLead("user-1", { id: "lead-2" }) },
    ] });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.reviewRequired).toBe(1);
    expect(get("leads/lead-1")?.nextAction).toBe("NONE");
    expect(get("leads/lead-2")?.nextAction).toBe("NONE");
  });

  it("cancels without escalation when the profile completed before 72 hours", async () => {
    seed({ user: incompleteUser({ intendedProgram: "Master" }) });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.cancelled).toBe(1);
    expect(get(`communication_logs/${profileReminderCommunicationId("user-1")}`)).toMatchObject({
      humanFollowUpStatus: "CANCELLED",
      humanFollowUpCancellationReason: "PROFILE_COMPLETE",
    });
    expect(get("leads/lead-1")?.nextAction).toBe("NONE");
  });

  it("does not select a reminder before its 72-hour threshold", async () => {
    seed({ reminder: reminder("user-1", { humanFollowUpDueAt: new Date(now.getTime() + 1) }) });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.due).toBe(0);
    expect(summary.processed).toBe(0);
  });

  it("cancels an unverified Firebase Auth account", async () => {
    seed();
    followUpMocks.getUser.mockResolvedValue({ email: "awa@example.com", emailVerified: false, disabled: false });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.cancelled).toBe(1);
    expect(get("leads/lead-1")?.nextAction).toBe("NONE");
  });

  it("cancels a missing Firebase Auth account", async () => {
    seed();
    followUpMocks.getUser.mockRejectedValue({ code: "auth/user-not-found" });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.cancelled).toBe(1);
    expect(get("leads/lead-1")?.nextAction).toBe("NONE");
  });

  it("reports a transient Auth lookup failure without writing", async () => {
    seed();
    const before = structuredClone(get(`communication_logs/${profileReminderCommunicationId("user-1")}`));
    followUpMocks.getUser.mockRejectedValue(new Error("temporary"));
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.failed).toBe(1);
    expect(get(`communication_logs/${profileReminderCommunicationId("user-1")}`)).toEqual(before);
  });

  it("resolves an active escalation and clears only the system action", async () => {
    seed({
      user: incompleteUser({ intendedProgram: "Master" }),
      reminder: reminder("user-1", {
        humanFollowUpStatus: "ACTIVE",
        humanFollowUpDueAt: null,
        humanFollowUpLeadId: "lead-1",
        humanFollowUpNotificationId: humanFollowUpNotificationId("user-1"),
      }),
      leads: [{ id: "lead-1", data: linkedLead("user-1", {
        nextAction: "FOLLOW_UP",
        followUpReason: HUMAN_FOLLOW_UP_REASON,
        nextActionSource: HUMAN_FOLLOW_UP_SOURCE,
      }) }],
    });
    followUpMocks.documents.set(`admin_notifications/${humanFollowUpNotificationId("user-1")}`, { read: false, resolved: false });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.resolved).toBe(1);
    expect(get("leads/lead-1")).toMatchObject({ nextAction: "NONE", followUpReason: null, nextActionSource: null });
    expect(get(`admin_case_events/${humanFollowUpResolutionEventId("user-1")}`)).toBeDefined();
  });

  it("resolves the escalation but preserves an intervening human action", async () => {
    seed({
      user: incompleteUser({ intendedProgram: "Master" }),
      reminder: reminder("user-1", { humanFollowUpStatus: "ACTIVE", humanFollowUpDueAt: null, humanFollowUpLeadId: "lead-1" }),
      leads: [{ id: "lead-1", data: linkedLead("user-1", { nextAction: "CALL_PROSPECT", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE }) }],
    });
    const summary = await processOnboardingHumanFollowUps({ now });
    expect(summary.resolved).toBe(1);
    expect(get("leads/lead-1")).toMatchObject({ nextAction: "CALL_PROSPECT", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE });
  });

  it("caps each query to the configured batch size", async () => {
    seed();
    await processOnboardingHumanFollowUps({ now, batchSize: 999 });
    expect(followUpMocks.limitCalls.filter((limit) => limit === 25)).toHaveLength(2);
    expect(followUpMocks.limitCalls.every((limit) => limit <= 25)).toBe(true);
  });
});
