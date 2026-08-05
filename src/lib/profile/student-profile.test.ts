import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => {
  class MockTimestamp {
    constructor(private readonly date: Date) {}

    toDate() {
      return this.date;
    }
  }

  return {
    doc: vi.fn((db: unknown, collectionName: string, id: string) => ({
      collectionName,
      db,
      id,
    })),
    getDoc: vi.fn(),
    serverTimestamp: vi.fn(() => "server-timestamp"),
    setDoc: vi.fn(),
    Timestamp: MockTimestamp,
  };
});

vi.mock("firebase/firestore", () => ({
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  serverTimestamp: firestoreMocks.serverTimestamp,
  setDoc: firestoreMocks.setDoc,
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseDb: () => ({ app: "firebase-db" }),
}));

import {
  createEmptyEditableProfile,
  getProfileCompletion,
  getSelectedServiceLabel,
  mapStudentProfile,
  updateStudentProfile,
} from "@/lib/profile/student-profile";
import type { EditableStudentProfile } from "@/types/student-profile";

function editableProfile(
  overrides: Partial<EditableStudentProfile> = {},
): EditableStudentProfile {
  return {
    ...createEmptyEditableProfile(),
    firstName: "Awa",
    lastName: "Ndiaye",
    birthDate: "2000-01-01",
    birthCountry: "Senegal",
    phoneWhatsApp: " +221 77 000 00 00 ",
    dateOfBirth: "2000-01-01",
    placeOfBirth: "Dakar",
    nationality: "Senegalaise",
    countryOfResidence: "Senegal",
    destinationCountry: "France",
    targetSchoolName: "Universite de Paris",
    selectedService: "attestation_hebergement",
    ...overrides,
  };
}

beforeEach(() => {
  firestoreMocks.doc.mockClear();
  firestoreMocks.getDoc.mockReset();
  firestoreMocks.serverTimestamp.mockClear();
  firestoreMocks.setDoc.mockReset();
});

describe("student profile mapping", () => {
  it("maps real profile fields without inventing missing data", () => {
    const profile = mapStudentProfile("client-1", {
      firstName: "Awa",
      lastName: "Ndiaye",
      email: "awa@example.com",
      destinationCountry: "Canada",
      selectedService: "avi",
      admissionStatus: "not-a-real-status",
    });

    expect(profile).toMatchObject({
      uid: "client-1",
      email: "awa@example.com",
      firstName: "Awa",
      lastName: "Ndiaye",
      fullName: "Awa Ndiaye",
      destinationCountry: "Canada",
      selectedService: "avi",
      admissionStatus: null,
    });
    expect(profile.nationality).toBeNull();
  });

  it("keeps an empty editable profile empty", () => {
    expect(createEmptyEditableProfile()).toMatchObject({
      firstName: null,
      lastName: null,
      fullName: null,
      birthDate: null,
      birthCountry: null,
      destinationCountry: null,
      selectedService: null,
    });
  });

  it("maps legacy country strings to controlled references", () => {
    const profile = mapStudentProfile("client-legacy", {
      birthCountry: "Cameroun",
      originCountry: "Senegal",
      nationality: "Senegalaise",
      countryOfResidence: "France",
      destinationCountry: "France",
    });

    expect(profile.originCountryReference).toEqual({
      codeAlpha2: "SN",
      codeAlpha3: "SEN",
      label: "Sénégal",
    });
    expect(profile.nationalityReference).toEqual({
      countryCodeAlpha2: "SN",
      countryCodeAlpha3: "SEN",
      label: "Sénégalaise",
    });
    expect(profile.countryOfResidenceReference?.codeAlpha2).toBe("FR");
    expect(profile.destinationCountryReference?.codeAlpha3).toBe("FRA");
  });

  it("reports incomplete and partial profile completion explicitly", () => {
    expect(getProfileCompletion(null)).toMatchObject({
      percent: 0,
      state: "incomplete",
    });

    const partialProfile = mapStudentProfile("client-1", {
      firstName: "Awa",
      lastName: "Ndiaye",
      birthDate: "2000-01-01",
    });

    const completion = getProfileCompletion(partialProfile);

    expect(completion.state).toBe("partial");
    expect(completion.percent).toBeGreaterThan(0);
    expect(completion.percent).toBeLessThan(100);
    expect(completion.missingFields).toContain("destinationCountry");
  });

  it("uses a clear empty label for missing selected service", () => {
    expect(getSelectedServiceLabel(null)).toBe("A renseigner");
  });

  it("updates an existing user profile without overwriting system fields", async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => true });

    await updateStudentProfile("client-1", editableProfile(), {
      email: "awa@example.com",
    });

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      { app: "firebase-db" },
      "users",
      "client-1",
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "client-1" }),
      expect.objectContaining({
        firstName: "Awa",
        lastName: "Ndiaye",
        fullName: "Awa Ndiaye",
        phoneWhatsApp: "+221 77 000 00 00",
        serviceInterest: "attestation_hebergement",
        profileSource: "user_profile",
        lastIntent: "profile_update",
        updatedAt: "server-timestamp",
        profileUpdatedAt: "server-timestamp",
      }),
      { merge: true },
    );

    const payload = firestoreMocks.setDoc.mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(payload).not.toHaveProperty("uid");
    expect(payload).not.toHaveProperty("email");
    expect(payload).not.toHaveProperty("createdAt");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("accountStatus");
    expect(payload).not.toHaveProperty("createdVia");
    expect(payload).not.toHaveProperty("clientOrigin");
    expect(payload).not.toHaveProperty("marketingConsent");
    expect(payload).not.toHaveProperty("marketingConsentAt");
    expect(payload).not.toHaveProperty("firstTouch");
    expect(payload).not.toHaveProperty("lastTouch");
  });

  it("repairs a missing users/{uid} document with minimal safe fields", async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => false });

    await updateStudentProfile("auth-only-1", editableProfile(), {
      email: "AUTH-ONLY@EXAMPLE.COM",
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: "users", id: "auth-only-1" }),
      expect.objectContaining({
        uid: "auth-only-1",
        email: "auth-only@example.com",
        role: "student",
        status: "active",
        createdVia: "profile_recovery",
        profileSource: "user_profile",
        clientOrigin: "dashboard",
        selectedService: "attestation_hebergement",
        serviceInterest: "attestation_hebergement",
        lastIntent: "profile_update",
        marketingConsent: false,
        marketingConsentAt: null,
        firstTouch: null,
        lastTouch: null,
        firstName: "Awa",
        lastName: "Ndiaye",
        fullName: "Awa Ndiaye",
        createdAt: "server-timestamp",
        updatedAt: "server-timestamp",
        profileUpdatedAt: "server-timestamp",
      }),
      { merge: true },
    );

    expect(firestoreMocks.doc).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.doc).not.toHaveBeenCalledWith(
      expect.anything(),
      "client_cases",
      expect.anything(),
    );
  });
});
