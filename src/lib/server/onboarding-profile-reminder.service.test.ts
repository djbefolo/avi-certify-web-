import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROFILE_REMINDER_MAX_ATTEMPTS,
  PROFILE_REMINDER_TEMPLATE,
  profileReminderCommunicationId,
  profileReminderIdempotencyKey,
} from "@/lib/server/onboarding-profile-reminder.model";

type StoredDocument = Record<string, unknown>;
type DocumentReference = { id: string; path: string };

const reminderMocks = vi.hoisted(() => {
  const documents = new Map<string, StoredDocument>();
  let transactionChain: Promise<unknown> = Promise.resolve();

  function snapshot(reference: DocumentReference) {
    const data = documents.get(reference.path);
    return {
      id: reference.id,
      ref: reference,
      exists: Boolean(data),
      data: () => data,
      get: (field: string) => data?.[field],
    };
  }

  function transaction() {
    return {
      get: vi.fn(async (reference: DocumentReference) => snapshot(reference)),
      set: vi.fn(
        (
          reference: DocumentReference,
          data: StoredDocument,
          options?: { merge?: boolean },
        ) => {
          const existing = documents.get(reference.path) ?? {};
          documents.set(reference.path, options?.merge ? { ...existing, ...data } : { ...data });
        },
      ),
    };
  }

  function query() {
    let queryLimit = 25;
    let dueAt = new Date(8640000000000000);
    const chain = {
      where: vi.fn((_field: string, _operator: string, value: Date) => {
        dueAt = value;
        return chain;
      }),
      orderBy: vi.fn(() => chain),
      limit: vi.fn((value: number) => {
        queryLimit = value;
        return chain;
      }),
      get: vi.fn(async () => {
        const docs = [...documents.entries()]
          .filter(([path, data]) => {
            const value = data.nextAttemptAt;
            return (
              path.startsWith("communication_logs/") &&
              value instanceof Date &&
              value.getTime() <= dueAt.getTime()
            );
          })
          .sort(
            ([, left], [, right]) =>
              (left.nextAttemptAt as Date).getTime() -
              (right.nextAttemptAt as Date).getTime(),
          )
          .slice(0, queryLimit)
          .map(([path]) => {
            const id = path.slice("communication_logs/".length);
            return snapshot({ id, path });
          });
        return { docs };
      }),
    };
    return chain;
  }

  const db = {
    collection: vi.fn((collectionName: string) => {
      const chain = query();
      return {
        ...chain,
        doc: vi.fn((id: string) => ({ id, path: `${collectionName}/${id}` })),
      };
    }),
    runTransaction: vi.fn(
      <T>(callback: (value: ReturnType<typeof transaction>) => Promise<T>) => {
        const result = transactionChain.then(() => callback(transaction()));
        transactionChain = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    ),
  };

  return {
    documents,
    db,
    resetTransactions: () => {
      transactionChain = Promise.resolve();
    },
    getUser: vi.fn(),
    sendProfileReminderEmailWithResult: vi.fn(),
    serverTimestamp: vi.fn(() => new Date("2026-08-12T12:00:00.000Z")),
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: reminderMocks.serverTimestamp },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => reminderMocks.db,
  getAdminAuth: () => ({ getUser: reminderMocks.getUser }),
}));

vi.mock("@/lib/server/email.service", () => ({
  sendProfileReminderEmailWithResult:
    reminderMocks.sendProfileReminderEmailWithResult,
}));

import { processDueProfileReminders } from "@/lib/server/onboarding-profile-reminder.service";

const now = new Date("2026-08-12T12:00:00.000Z");

function incompleteUser(overrides: StoredDocument = {}) {
  return {
    uid: "user-1",
    email: "awa@example.com",
    status: "active",
    emailVerifiedAt: new Date("2026-08-11T10:00:00.000Z"),
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
    marketingConsent: false,
    crmStatus: "new",
    identityLinkStatus: "LINKED",
    ...overrides,
  };
}

function reminder(uid = "user-1", overrides: StoredDocument = {}) {
  return {
    id: profileReminderCommunicationId(uid),
    uid,
    caseId: null,
    type: "EMAIL",
    template: PROFILE_REMINDER_TEMPLATE,
    recipient: `${uid}@example.com`,
    status: "PENDING",
    provider: "resend",
    idempotencyKey: profileReminderIdempotencyKey(uid),
    attemptCount: 0,
    dueAt: new Date("2026-08-12T10:00:00.000Z"),
    nextAttemptAt: new Date("2026-08-12T10:00:00.000Z"),
    leaseId: null,
    leaseExpiresAt: null,
    ...overrides,
  };
}

function seed(uid = "user-1", options?: {
  user?: StoredDocument;
  reminder?: StoredDocument;
}) {
  reminderMocks.documents.set(
    `users/${uid}`,
    options?.user ?? incompleteUser({ uid, email: `${uid}@example.com` }),
  );
  reminderMocks.documents.set(
    `communication_logs/${profileReminderCommunicationId(uid)}`,
    options?.reminder ?? reminder(uid),
  );
}

function sentResult(id = "resend-profile-1") {
  return {
    sent: true,
    messageId: id,
    status: "SENT" as const,
    provider: "resend" as const,
  };
}

beforeEach(() => {
  reminderMocks.documents.clear();
  reminderMocks.resetTransactions();
  reminderMocks.db.collection.mockClear();
  reminderMocks.db.runTransaction.mockClear();
  reminderMocks.getUser.mockReset();
  reminderMocks.sendProfileReminderEmailWithResult.mockReset();
  reminderMocks.serverTimestamp.mockClear();
  reminderMocks.getUser.mockImplementation(async (uid: string) => ({
    uid,
    email: `${uid}@example.com`,
    emailVerified: true,
    disabled: false,
  }));
  reminderMocks.sendProfileReminderEmailWithResult.mockResolvedValue(sentResult());
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("onboarding profile reminder worker", () => {
  it("sends one due reminder and records a SENT communication log", async () => {
    seed();

    const summary = await processDueProfileReminders({ now });
    const log = reminderMocks.documents.get(
      `communication_logs/${profileReminderCommunicationId("user-1")}`,
    );

    expect(summary).toEqual({
      eligible: 1,
      processed: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      cancelled: 0,
    });
    expect(log).toMatchObject({
      status: "SENT",
      attemptCount: 1,
      providerMessageId: "resend-profile-1",
      nextAttemptAt: null,
    });
    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenCalledWith(
      { email: "user-1@example.com", fullName: "Awa Ndiaye" },
      profileReminderIdempotencyKey("user-1"),
    );
  });

  it("cancels without sending when the profile was completed before the cron", async () => {
    seed("user-1", { user: incompleteUser({ intendedProgram: "Master" }) });

    const summary = await processDueProfileReminders({ now });
    const log = reminderMocks.documents.get(
      `communication_logs/${profileReminderCommunicationId("user-1")}`,
    );

    expect(summary.cancelled).toBe(1);
    expect(log).toMatchObject({
      status: "CANCELLED",
      cancellationReason: "PROFILE_COMPLETE",
      nextAttemptAt: null,
    });
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("rechecks the profile immediately before send and prevents a late false reminder", async () => {
    seed();
    reminderMocks.getUser.mockImplementationOnce(async () => {
      reminderMocks.documents.set(
        "users/user-1",
        incompleteUser({ intendedProgram: "Master" }),
      );
      return {
        uid: "user-1",
        email: "user-1@example.com",
        emailVerified: true,
        disabled: false,
      };
    });

    const summary = await processDueProfileReminders({ now });

    expect(summary.cancelled).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("does not resend a logical reminder already SENT", async () => {
    seed("user-1", { reminder: reminder("user-1", { status: "SENT" }) });

    const summary = await processDueProfileReminders({ now });

    expect(summary.skipped).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("lets only one of two concurrent workers send", async () => {
    seed();
    let release!: (value: ReturnType<typeof sentResult>) => void;
    reminderMocks.sendProfileReminderEmailWithResult.mockImplementationOnce(
      () => new Promise((resolve) => { release = resolve; }),
    );

    const firstRun = processDueProfileReminders({ now });
    await vi.waitFor(() => {
      expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenCalledTimes(1);
    });
    const secondRun = await processDueProfileReminders({ now });
    release(sentResult());
    const firstSummary = await firstRun;

    expect(firstSummary.sent).toBe(1);
    expect(secondRun.sent).toBe(0);
    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenCalledTimes(1);
  });

  it("records provider failure and increments attemptCount", async () => {
    seed();
    reminderMocks.sendProfileReminderEmailWithResult.mockResolvedValueOnce({
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    });

    const summary = await processDueProfileReminders({ now });
    const log = reminderMocks.documents.get(
      `communication_logs/${profileReminderCommunicationId("user-1")}`,
    );

    expect(summary.failed).toBe(1);
    expect(log).toMatchObject({
      status: "FAILED",
      attemptCount: 1,
      error: expect.objectContaining({ code: "SEND_FAILED", retryable: true }),
    });
    expect(log?.nextAttemptAt).toBeInstanceOf(Date);
  });

  it("retries the same logical reminder with the same provider idempotency key", async () => {
    seed("user-1", {
      reminder: reminder("user-1", { status: "FAILED", attemptCount: 1 }),
    });

    await processDueProfileReminders({ now });

    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenCalledWith(
      expect.any(Object),
      profileReminderIdempotencyKey("user-1"),
    );
    expect(reminderMocks.documents.has(
      `communication_logs/${profileReminderCommunicationId("user-1")}`,
    )).toBe(true);
  });

  it("reuses the provider idempotency key after a lost provider response", async () => {
    seed();
    reminderMocks.sendProfileReminderEmailWithResult
      .mockRejectedValueOnce(new Error("response lost after provider acceptance"))
      .mockResolvedValueOnce(sentResult("resend-after-loss"));

    const first = await processDueProfileReminders({ now });
    const logPath =
      `communication_logs/${profileReminderCommunicationId("user-1")}`;
    const failedLog = reminderMocks.documents.get(logPath);
    reminderMocks.documents.set(logPath, {
      ...failedLog,
      nextAttemptAt: now,
    });
    const second = await processDueProfileReminders({ now });

    expect(first.failed).toBe(1);
    expect(second.sent).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenCalledTimes(2);
    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      profileReminderIdempotencyKey("user-1"),
    );
    expect(reminderMocks.sendProfileReminderEmailWithResult).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      profileReminderIdempotencyKey("user-1"),
    );
  });

  it("makes the third failed attempt terminal", async () => {
    seed("user-1", {
      reminder: reminder("user-1", {
        status: "FAILED",
        attemptCount: PROFILE_REMINDER_MAX_ATTEMPTS - 1,
      }),
    });
    reminderMocks.sendProfileReminderEmailWithResult.mockResolvedValueOnce({
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    });

    await processDueProfileReminders({ now });
    const log = reminderMocks.documents.get(
      `communication_logs/${profileReminderCommunicationId("user-1")}`,
    );

    expect(log).toMatchObject({ status: "FAILED", attemptCount: 3, nextAttemptAt: null });
    expect(log?.error).toEqual(expect.objectContaining({ retryable: false }));
  });

  it("cancels a disabled Firebase Auth account", async () => {
    seed();
    reminderMocks.getUser.mockResolvedValueOnce({
      uid: "user-1",
      email: "user-1@example.com",
      emailVerified: true,
      disabled: true,
    });

    const summary = await processDueProfileReminders({ now });

    expect(summary.cancelled).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("cancels an email-unverified Firebase Auth account", async () => {
    seed();
    reminderMocks.getUser.mockResolvedValueOnce({
      uid: "user-1",
      email: "user-1@example.com",
      emailVerified: false,
      disabled: false,
    });

    const summary = await processDueProfileReminders({ now });

    expect(summary.cancelled).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("cancels a deleted Firebase Auth account", async () => {
    seed();
    reminderMocks.getUser.mockRejectedValueOnce({ code: "auth/user-not-found" });

    const summary = await processDueProfileReminders({ now });

    expect(summary.cancelled).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("cancels when the verified email is missing", async () => {
    seed();
    reminderMocks.getUser.mockResolvedValueOnce({
      uid: "user-1",
      email: null,
      emailVerified: true,
      disabled: false,
    });

    const summary = await processDueProfileReminders({ now });

    expect(summary.cancelled).toBe(1);
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("honors the fixed batch limit without loading every pending user", async () => {
    for (let index = 0; index < 30; index += 1) {
      seed(`batch-${index}`);
    }

    const summary = await processDueProfileReminders({ now, batchSize: 100 });

    expect(summary.eligible).toBe(25);
    expect(summary.sent).toBe(25);
  });

  it("ignores old verified users without a deterministic due document", async () => {
    reminderMocks.documents.set("users/old-user", incompleteUser({ uid: "old-user" }));

    const summary = await processDueProfileReminders({ now });

    expect(summary.eligible).toBe(0);
    expect(reminderMocks.getUser).not.toHaveBeenCalled();
  });

  it("does not implicitly select or backfill Halimalena", async () => {
    reminderMocks.documents.set(
      "users/halimalena",
      incompleteUser({ uid: "halimalena", email: "halimalena@hotmail.com" }),
    );

    await processDueProfileReminders({ now });

    expect(reminderMocks.getUser).not.toHaveBeenCalledWith("halimalena");
    expect(reminderMocks.sendProfileReminderEmailWithResult).not.toHaveBeenCalled();
  });

  it("profile reminder must not convert or qualify the prospect", async () => {
    seed();
    const originalUser = { ...reminderMocks.documents.get("users/user-1") };

    await processDueProfileReminders({ now });
    const finalUser = reminderMocks.documents.get("users/user-1");

    expect(finalUser).toEqual(originalUser);
    expect(finalUser).toMatchObject({
      crmStatus: "new",
      identityLinkStatus: "LINKED",
      marketingConsent: false,
    });
    expect(reminderMocks.db.collection).not.toHaveBeenCalledWith("leads");
    expect(reminderMocks.db.collection).not.toHaveBeenCalledWith("client_cases");
    expect(reminderMocks.db.collection).not.toHaveBeenCalledWith("payments");
    expect(reminderMocks.db.collection).not.toHaveBeenCalledWith("services");
    expect(reminderMocks.db.collection).not.toHaveBeenCalledWith("housing_requests");
  });
});
