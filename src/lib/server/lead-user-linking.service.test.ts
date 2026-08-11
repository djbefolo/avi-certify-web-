import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDocument = Record<string, unknown>;
type DocumentReference = {
  kind: "document";
  id: string;
  path: string;
};
type QueryReference = {
  kind: "query";
  collectionName: string;
  field: string;
  value: unknown;
  limitCount: number;
};

const linkingMocks = vi.hoisted(() => {
  const documents = new Map<string, StoredDocument>();
  let transactionChain: Promise<unknown> = Promise.resolve();
  let timestampSequence = 0;

  function documentReference(
    collectionName: string,
    id: string,
  ): DocumentReference {
    return {
      kind: "document",
      id,
      path: `${collectionName}/${id}`,
    };
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
    const docs = [...documents.entries()]
      .filter(
        ([path, data]) =>
          path.startsWith(prefix) && data[reference.field] === reference.value,
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, reference.limitCount)
      .map(([path]) =>
        documentSnapshot(
          documentReference(reference.collectionName, path.slice(prefix.length)),
        ),
      );

    return { docs };
  }

  function transaction() {
    return {
      get: vi.fn(async (reference: DocumentReference | QueryReference) =>
        reference.kind === "query"
          ? querySnapshot(reference)
          : documentSnapshot(reference),
      ),
      set: vi.fn(
        (
          reference: DocumentReference,
          data: StoredDocument,
          options?: { merge?: boolean },
        ) => {
          const existing = documents.get(reference.path) ?? {};
          documents.set(
            reference.path,
            options?.merge ? { ...existing, ...data } : { ...data },
          );
        },
      ),
      create: vi.fn(
        (reference: DocumentReference, data: StoredDocument) => {
          if (documents.has(reference.path)) {
            throw new Error(`Document already exists: ${reference.path}`);
          }
          documents.set(reference.path, { ...data });
        },
      ),
    };
  }

  const collection = vi.fn((collectionName: string) => ({
    doc: (id: string) => documentReference(collectionName, id),
    where: (field: string, _operator: string, value: unknown) => ({
      limit: (limitCount: number): QueryReference => ({
        kind: "query",
        collectionName,
        field,
        value,
        limitCount,
      }),
    }),
  }));

  const db = {
    collection,
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
    collection,
    db,
    documents,
    getAdminFirestore: vi.fn(() => db),
    resetTransactions: () => {
      transactionChain = Promise.resolve();
    },
    serverTimestamp: vi.fn(() => `server-timestamp-${++timestampSequence}`),
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: linkingMocks.serverTimestamp,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: linkingMocks.getAdminFirestore,
}));

import { linkLeadToVerifiedUser } from "@/lib/server/lead-user-linking.service";

function setLead(id: string, data: StoredDocument) {
  linkingMocks.documents.set(`leads/${id}`, structuredClone(data));
}

function getLead(id: string) {
  return linkingMocks.documents.get(`leads/${id}`);
}

function notifications() {
  return [...linkingMocks.documents.entries()]
    .filter(([path]) => path.startsWith("admin_notifications/"))
    .map(([, data]) => data);
}

function verifiedIdentity(uid: string, email: string) {
  return { uid, email, emailVerified: true } as const;
}

beforeEach(() => {
  linkingMocks.documents.clear();
  linkingMocks.resetTransactions();
  linkingMocks.collection.mockClear();
  linkingMocks.db.runTransaction.mockClear();
  linkingMocks.getAdminFirestore.mockClear();
  linkingMocks.serverTimestamp.mockClear();
});

describe("secure verified-email lead identity linking", () => {
  it("returns NO_MATCH when no lead matches", async () => {
    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-0", "none@example.com"),
      ),
    ).resolves.toEqual({ status: "NO_MATCH" });

    expect(linkingMocks.documents.size).toBe(0);
  });

  it("linking a verified lead must not convert the prospect into a client", async () => {
    const original = {
      fullName: "Awa Prospect",
      email: "awa@example.com",
      normalizedEmail: "awa@example.com",
      requestedService: "hebergement",
      residenceCountry: "cameroun",
      destinationCountry: "france",
      source: "landing_page",
      sourceDetail: "landing_page",
      crmStatus: "NEW",
      contactConsent: true,
      marketingConsent: false,
      createdAt: "preserved-created-at",
    };
    setLead("public-lead", original);

    const result = await linkLeadToVerifiedUser(
      verifiedIdentity("firebase-user-1", "awa@example.com"),
    );

    expect(result).toEqual({ status: "LINKED" });
    expect(getLead("public-lead")).toEqual({
      ...original,
      linkedUid: "firebase-user-1",
      linkedAt: "server-timestamp-1",
      linkMethod: "VERIFIED_EMAIL",
      identityLinkStatus: "LINKED",
    });
    expect(getLead("public-lead")).toMatchObject({
      crmStatus: "NEW",
      requestedService: "hebergement",
      contactConsent: true,
      marketingConsent: false,
      source: "landing_page",
    });
    expect(linkingMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(linkingMocks.collection).not.toHaveBeenCalledWith("payments");
    expect(linkingMocks.collection).not.toHaveBeenCalledWith("services");
  });

  it("returns ALREADY_LINKED on a repeated call without a second write", async () => {
    setLead("lead-repeat", {
      email: "repeat@example.com",
      normalizedEmail: "repeat@example.com",
      crmStatus: "NEW",
    });

    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-repeat", "repeat@example.com"),
      ),
    ).resolves.toEqual({ status: "LINKED" });
    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-repeat", "repeat@example.com"),
      ),
    ).resolves.toEqual({ status: "ALREADY_LINKED" });

    expect(linkingMocks.serverTimestamp).toHaveBeenCalledTimes(1);
  });

  it("allows at most one effective link across two concurrent calls", async () => {
    setLead("lead-concurrent", {
      email: "concurrent@example.com",
      normalizedEmail: "concurrent@example.com",
      crmStatus: "NEW",
    });

    const results = await Promise.all([
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-concurrent", "concurrent@example.com"),
      ),
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-concurrent", "concurrent@example.com"),
      ),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([
      "ALREADY_LINKED",
      "LINKED",
    ]);
    expect(linkingMocks.serverTimestamp).toHaveBeenCalledTimes(1);
  });

  it("returns CONFLICT and creates one idempotent admin notification for another UID", async () => {
    const original = {
      email: "conflict@example.com",
      normalizedEmail: "conflict@example.com",
      linkedUid: "firebase-user-owner",
      linkedAt: "preserved-linked-at",
      linkMethod: "VERIFIED_EMAIL",
      crmStatus: "CONTACTED",
    };
    setLead("lead-conflict", original);

    const first = await linkLeadToVerifiedUser(
      verifiedIdentity("firebase-user-other", "conflict@example.com"),
    );
    const second = await linkLeadToVerifiedUser(
      verifiedIdentity("firebase-user-other", "conflict@example.com"),
    );

    expect(first).toEqual({ status: "CONFLICT" });
    expect(second).toEqual({ status: "CONFLICT" });
    expect(getLead("lead-conflict")).toEqual(original);
    expect(notifications()).toHaveLength(1);
    expect(notifications()[0]).toMatchObject({
      type: "admin_action_required",
      severity: "critical",
      relatedUid: "firebase-user-other",
      metadata: {
        category: "lead_identity_linking",
        reason: "LEAD_ALREADY_LINKED_TO_DIFFERENT_UID",
        candidateLeadIds: ["lead-conflict"],
        candidateCount: 1,
      },
    });
  });

  it("returns AMBIGUOUS, links nothing, and notifies admin without leaking candidates", async () => {
    const firstLead = {
      email: "shared@example.com",
      normalizedEmail: "shared@example.com",
      crmStatus: "NEW",
    };
    const secondLead = {
      email: "shared@example.com",
      normalizedEmail: "shared@example.com",
      crmStatus: "QUALIFIED",
    };
    setLead("lead-shared-a", firstLead);
    setLead("lead-shared-b", secondLead);

    const result = await linkLeadToVerifiedUser(
      verifiedIdentity("firebase-user-shared", "shared@example.com"),
    );

    expect(result).toEqual({ status: "AMBIGUOUS" });
    expect(Object.keys(result)).toEqual(["status"]);
    expect(getLead("lead-shared-a")).toEqual(firstLead);
    expect(getLead("lead-shared-b")).toEqual(secondLead);
    expect(notifications()).toHaveLength(1);
    expect(notifications()[0]).toMatchObject({
      type: "admin_action_required",
      severity: "warning",
      metadata: {
        reason: "MULTIPLE_MATCHES",
        candidateLeadIds: ["lead-shared-a", "lead-shared-b"],
        candidateCount: 2,
      },
    });
  });

  it("refuses an unverified Firebase email before reading Firestore", async () => {
    await expect(
      linkLeadToVerifiedUser({
        uid: "firebase-user-unverified",
        email: "unverified@example.com",
        emailVerified: false,
      }),
    ).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });

    expect(linkingMocks.getAdminFirestore).not.toHaveBeenCalled();
  });

  it("keeps lead identity fields server-only in Firestore rules", () => {
    const rules = readFileSync(
      resolve(process.cwd(), "firestore.rules"),
      "utf8",
    );
    const leadsRule = rules.slice(
      rules.indexOf("match /leads/{leadId}"),
      rules.indexOf("match /users/{userId}"),
    );

    expect(leadsRule).toContain("allow read, write: if false;");
    expect(leadsRule).not.toContain("request.auth.uid");
  });

  it("matches case and whitespace differences while preserving a plus alias", async () => {
    setLead("lead-plus", {
      email: "test+alias@example.com",
      normalizedEmail: "test+alias@example.com",
      crmStatus: "NEW",
    });

    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity(
          "firebase-user-plus",
          "  Test+Alias@Example.COM  ",
        ),
      ),
    ).resolves.toEqual({ status: "LINKED" });
    expect(getLead("lead-plus")?.linkedUid).toBe("firebase-user-plus");
  });

  it("links a guide lead without altering guide delivery or consent", async () => {
    const guideLead = {
      email: "guide@example.com",
      normalizedEmail: "guide@example.com",
      source: "guide",
      requestedService: "guide_france_2026",
      marketingConsent: true,
      contactConsent: false,
      guideDeliveryStatus: "READY",
      crmStatus: "NEW",
    };
    setLead("guide-lead", guideLead);

    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-guide", "guide@example.com"),
      ),
    ).resolves.toEqual({ status: "LINKED" });
    expect(getLead("guide-lead")).toMatchObject(guideLead);
  });

  it("uses a bounded exact-email fallback for a legacy lead without normalizedEmail", async () => {
    setLead("legacy-lowercase", {
      email: "legacy@example.com",
      requestedService: "hebergement",
      crmStatus: "NEW",
    });

    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-legacy", "LEGACY@EXAMPLE.COM"),
      ),
    ).resolves.toEqual({ status: "LINKED" });
    expect(getLead("legacy-lowercase")?.linkedUid).toBe(
      "firebase-user-legacy",
    );
  });

  it("does not scan or guess a legacy email with non-normalized casing", async () => {
    setLead("legacy-unsafe", {
      email: " Legacy@Example.COM ",
      crmStatus: "NEW",
    });

    await expect(
      linkLeadToVerifiedUser(
        verifiedIdentity("firebase-user-legacy-unsafe", "legacy@example.com"),
      ),
    ).resolves.toEqual({ status: "NO_MATCH" });
    expect(getLead("legacy-unsafe")).not.toHaveProperty("linkedUid");
  });
});
