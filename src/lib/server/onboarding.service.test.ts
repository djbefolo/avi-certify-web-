import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDocument = Record<string, unknown>;
type DocumentReference = { id: string; path: string };

const onboardingMocks = vi.hoisted(() => {
  const documents = new Map<string, StoredDocument>();
  let transactionChain: Promise<unknown> = Promise.resolve();
  let timestampSequence = 0;

  function snapshot(reference: DocumentReference) {
    const data = documents.get(reference.path);

    return {
      exists: Boolean(data),
      data: () => data,
      get: (field: string) => data?.[field],
    };
  }

  function transaction() {
    return {
      get: vi.fn(async (reference: DocumentReference) => snapshot(reference)),
      create: vi.fn(
        (reference: DocumentReference, data: StoredDocument) => {
          if (documents.has(reference.path)) {
            throw new Error(`Document already exists: ${reference.path}`);
          }
          documents.set(reference.path, { ...data });
        },
      ),
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
      update: vi.fn((reference: DocumentReference, data: StoredDocument) => {
        const existing = documents.get(reference.path);
        if (!existing) throw new Error(`Document missing: ${reference.path}`);
        documents.set(reference.path, { ...existing, ...data });
      }),
    };
  }

  const db = {
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((id: string) => ({ id, path: `${collectionName}/${id}` })),
    })),
    runTransaction: vi.fn(<T>(callback: (value: ReturnType<typeof transaction>) => Promise<T>) => {
      const result = transactionChain.then(() => callback(transaction()));
      transactionChain = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }),
  };

  return {
    db,
    documents,
    getAdminFirestore: vi.fn(() => db),
    resetTransactions: () => {
      transactionChain = Promise.resolve();
    },
    sendWelcomeEmailWithResult: vi.fn(),
    serverTimestamp: vi.fn(() => `server-timestamp-${++timestampSequence}`),
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: onboardingMocks.serverTimestamp,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: onboardingMocks.getAdminFirestore,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendWelcomeEmailWithResult: onboardingMocks.sendWelcomeEmailWithResult,
}));

import {
  authWelcomeCommunicationId,
  authWelcomeIdempotencyKey,
  completePostVerification,
} from "@/lib/server/onboarding.service";

function sentResult(messageId = "resend-message-1") {
  return {
    sent: true,
    messageId,
    status: "SENT" as const,
    provider: "resend" as const,
  };
}

beforeEach(() => {
  onboardingMocks.documents.clear();
  onboardingMocks.resetTransactions();
  onboardingMocks.db.collection.mockClear();
  onboardingMocks.db.runTransaction.mockClear();
  onboardingMocks.getAdminFirestore.mockClear();
  onboardingMocks.sendWelcomeEmailWithResult.mockReset();
  onboardingMocks.serverTimestamp.mockClear();
  onboardingMocks.sendWelcomeEmailWithResult.mockResolvedValue(sentResult());
});

describe("post-verification onboarding transition", () => {
  it("sets emailVerifiedAt once and sends one welcome for repeated calls", async () => {
    onboardingMocks.documents.set("users/user-1", {
      uid: "user-1",
      email: "awa@example.com",
      firstName: "Awa",
      lastName: "Ndiaye",
      role: "student",
      customProfileField: "preserved",
    });

    const first = await completePostVerification({
      uid: "user-1",
      email: "AWA@EXAMPLE.COM",
    });
    const verifiedAt = onboardingMocks.documents.get("users/user-1")?.emailVerifiedAt;
    const second = await completePostVerification({
      uid: "user-1",
      email: "awa@example.com",
    });

    expect(first).toMatchObject({
      emailVerifiedTransitionCreated: true,
      profileRecovered: false,
      welcomeStatus: "SENT",
    });
    expect(second).toMatchObject({
      emailVerifiedTransitionCreated: false,
      welcomeStatus: "SENT",
    });
    expect(onboardingMocks.sendWelcomeEmailWithResult).toHaveBeenCalledTimes(1);
    expect(onboardingMocks.sendWelcomeEmailWithResult).toHaveBeenCalledWith(
      { email: "awa@example.com", fullName: "Awa Ndiaye" },
      authWelcomeIdempotencyKey("user-1"),
    );
    expect(onboardingMocks.documents.get("users/user-1")).toMatchObject({
      customProfileField: "preserved",
      emailVerifiedAt: verifiedAt,
    });

    const communication = onboardingMocks.documents.get(
      `communication_logs/${authWelcomeCommunicationId("user-1")}`,
    );
    expect(communication).toMatchObject({
      uid: "user-1",
      status: "SENT",
      attemptCount: 1,
      messageId: "resend-message-1",
      providerMessageId: "resend-message-1",
      idempotencyKey: "auth_welcome:user-1",
    });
  });

  it("recovers a missing users document with only trusted minimal fields", async () => {
    await completePostVerification({
      uid: "auth-only-1",
      email: "AUTH-ONLY@EXAMPLE.COM",
    });

    const profile = onboardingMocks.documents.get("users/auth-only-1");
    expect(profile).toMatchObject({
      uid: "auth-only-1",
      email: "auth-only@example.com",
      role: "student",
      status: "active",
      createdVia: "post_verification_recovery",
      profileSource: "firebase_auth",
      clientOrigin: "web_app",
      marketingConsent: false,
      marketingConsentAt: null,
    });
    expect(profile).not.toHaveProperty("firstName");
    expect(profile).not.toHaveProperty("lastName");
    expect(profile).not.toHaveProperty("birthDate");
  });

  it("lets only one concurrent call claim the welcome send", async () => {
    onboardingMocks.documents.set("users/user-2", {
      uid: "user-2",
      email: "user-2@example.com",
      role: "student",
    });
    let releaseSend!: (value: ReturnType<typeof sentResult>) => void;
    onboardingMocks.sendWelcomeEmailWithResult.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseSend = resolve;
        }),
    );

    const firstCall = completePostVerification({
      uid: "user-2",
      email: "user-2@example.com",
    });
    await vi.waitFor(() => {
      expect(onboardingMocks.sendWelcomeEmailWithResult).toHaveBeenCalledTimes(1);
    });
    const secondResult = await completePostVerification({
      uid: "user-2",
      email: "user-2@example.com",
    });

    expect(secondResult.welcomeStatus).toBe("PENDING");
    expect(onboardingMocks.sendWelcomeEmailWithResult).toHaveBeenCalledTimes(1);
    releaseSend(sentResult());
    await expect(firstCall).resolves.toMatchObject({ welcomeStatus: "SENT" });
  });

  it("records FAILED, retries it, then makes later calls a no-op", async () => {
    onboardingMocks.documents.set("users/user-3", {
      uid: "user-3",
      email: "user-3@example.com",
      role: "student",
    });
    onboardingMocks.sendWelcomeEmailWithResult
      .mockResolvedValueOnce({
        sent: false,
        messageId: null,
        status: "SEND_FAILED",
        provider: "resend",
      })
      .mockResolvedValueOnce(sentResult("resend-message-3"));

    const failed = await completePostVerification({
      uid: "user-3",
      email: "user-3@example.com",
    });
    const retried = await completePostVerification({
      uid: "user-3",
      email: "user-3@example.com",
    });
    const noOp = await completePostVerification({
      uid: "user-3",
      email: "user-3@example.com",
    });

    expect(failed.welcomeStatus).toBe("FAILED");
    expect(retried.welcomeStatus).toBe("SENT");
    expect(noOp.welcomeStatus).toBe("SENT");
    expect(onboardingMocks.sendWelcomeEmailWithResult).toHaveBeenCalledTimes(2);
    expect(
      onboardingMocks.documents.get(
        `communication_logs/${authWelcomeCommunicationId("user-3")}`,
      ),
    ).toMatchObject({
      status: "SENT",
      attemptCount: 2,
      messageId: "resend-message-3",
      error: null,
    });
  });
});
