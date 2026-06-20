import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  const set = vi.fn();
  const get = vi.fn();
  const doc = vi.fn((id: string) => ({ id, get, set }));
  const collection = vi.fn(() => ({ doc }));

  return {
    collection,
    doc,
    get,
    getAdminFirestore: vi.fn(() => ({ collection })),
    serverTimestamp: vi.fn(() => "server-timestamp"),
    set,
  };
});

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: firestoreMocks.serverTimestamp,
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: firestoreMocks.getAdminFirestore,
}));

import {
  createUserProfile,
  mapUserProfileToFirestore,
  type CreateUserProfileInput,
} from "@/lib/server/users.service";

const validProfile = {
  uid: "client-1",
  email: "awa@example.com",
  firstName: "Awa",
  lastName: "Ndiaye",
  birthDate: "2000-01-01",
  birthCountry: "Sénégal",
  phone: "+221770000000",
} satisfies CreateUserProfileInput;

beforeEach(() => {
  firestoreMocks.collection.mockClear();
  firestoreMocks.doc.mockClear();
  firestoreMocks.get.mockReset();
  firestoreMocks.getAdminFirestore.mockClear();
  firestoreMocks.serverTimestamp.mockClear();
  firestoreMocks.set.mockReset();
});

describe("server user profile traceability", () => {
  it("adds minimal CRM traceability fields on initial signup", () => {
    const document = mapUserProfileToFirestore(validProfile);

    expect(document).toMatchObject({
      uid: "client-1",
      email: "awa@example.com",
      createdVia: "signup",
      profileSource: "firebase_auth",
      clientOrigin: "web_app",
      serviceInterest: null,
      lastIntent: "signup",
      marketingConsent: false,
      marketingConsentAt: null,
      firstTouch: null,
      lastTouch: null,
      createdAt: "server-timestamp",
      updatedAt: "server-timestamp",
    });
    expect(document).not.toHaveProperty("utmSource");
    expect(document).not.toHaveProperty("utmMedium");
    expect(document).not.toHaveProperty("utmCampaign");
    expect(document).not.toHaveProperty("referrer");
  });

  it("creates users/{uid} without creating an operational client case", async () => {
    firestoreMocks.get.mockResolvedValueOnce({ exists: false });

    const result = await createUserProfile(validProfile);

    expect(result).toEqual({ id: "client-1", created: true });
    expect(firestoreMocks.collection).toHaveBeenCalledWith("users");
    expect(firestoreMocks.collection).not.toHaveBeenCalledWith("client_cases");
    expect(firestoreMocks.doc).toHaveBeenCalledWith("client-1");
    expect(firestoreMocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "client-1",
        createdVia: "signup",
        profileSource: "firebase_auth",
        marketingConsent: false,
        firstTouch: null,
        lastTouch: null,
      }),
      { merge: false },
    );
  });
});
