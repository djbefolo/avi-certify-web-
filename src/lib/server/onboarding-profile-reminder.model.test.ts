import { describe, expect, it } from "vitest";
import {
  PROFILE_REMINDER_DELAY_MS,
  PROFILE_REMINDER_MAX_ATTEMPTS,
  PROFILE_REMINDER_TEMPLATE,
  buildProfileReminderSchedule,
  getProfileReminderMissingFields,
  isProfileCompleteForReminder,
  isProfileReminderEligible,
  profileReminderCommunicationId,
  profileReminderIdempotencyKey,
} from "@/lib/server/onboarding-profile-reminder.model";

const now = new Date("2026-08-12T12:00:00.000Z");

function completeUser(overrides: Record<string, unknown> = {}) {
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
    intendedProgram: "Master",
    intendedAcademicYear: "2026-2027",
    intendedArrivalDate: "2026-09-01",
    selectedService: "avi",
    ...overrides,
  };
}

function pendingReminder(overrides: Record<string, unknown> = {}) {
  return {
    uid: "user-1",
    template: PROFILE_REMINDER_TEMPLATE,
    recipient: "awa@example.com",
    status: "PENDING",
    idempotencyKey: profileReminderIdempotencyKey("user-1"),
    attemptCount: 0,
    dueAt: new Date("2026-08-12T10:00:00.000Z"),
    nextAttemptAt: new Date("2026-08-12T10:00:00.000Z"),
    ...overrides,
  };
}

const verifiedAuth = {
  disabled: false,
  emailVerified: true,
  email: "awa@example.com",
};

describe("profile reminder model", () => {
  it("uses the canonical core profile fields for reminder completeness", () => {
    expect(isProfileCompleteForReminder(completeUser())).toBe(true);
    expect(getProfileReminderMissingFields(completeUser())).toEqual([]);
  });

  it("accepts canonical legacy aliases without creating another completeness rule", () => {
    const user = completeUser({
      birthDate: undefined,
      dateOfBirth: "1998-05-06",
      countryOfResidence: undefined,
      residenceCountry: "SN",
    });

    expect(isProfileCompleteForReminder(user)).toBe(true);
  });

  it("keeps an incomplete profile incomplete even when CRM data is sufficient", () => {
    const user = completeUser({ intendedProgram: null });

    expect(getProfileReminderMissingFields(user)).toContain("intendedProgram");
    expect(isProfileCompleteForReminder(user)).toBe(false);
  });

  it("creates one stable 24-hour due date and deterministic keys", () => {
    const verifiedAt = new Date("2026-08-11T10:00:00.000Z");
    const schedule = buildProfileReminderSchedule({
      uid: "user-1",
      email: "AWA@EXAMPLE.COM",
      emailVerifiedAt: verifiedAt,
      user: completeUser({ intendedProgram: null }),
    });

    expect(schedule?.id).toBe(profileReminderCommunicationId("user-1"));
    expect(schedule?.idempotencyKey).toBe(
      profileReminderIdempotencyKey("user-1"),
    );
    expect(schedule?.recipient).toBe("awa@example.com");
    expect(schedule?.dueAt.getTime()).toBe(
      verifiedAt.getTime() + PROFILE_REMINDER_DELAY_MS,
    );
    expect(schedule?.nextAttemptAt).toEqual(schedule?.dueAt);
  });

  it("does not schedule a reminder for an already complete profile", () => {
    expect(
      buildProfileReminderSchedule({
        uid: "user-1",
        email: "awa@example.com",
        emailVerifiedAt: now,
        user: completeUser(),
      }),
    ).toBeNull();
  });

  it("rejects an unverified user", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser({ intendedProgram: null, emailVerifiedAt: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result).toEqual({ eligible: false, reason: "EMAIL_UNVERIFIED" });
  });

  it("cancels eligibility when the profile became complete", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser(),
      auth: verifiedAuth,
      now,
    });

    expect(result).toEqual({ eligible: false, reason: "PROFILE_COMPLETE" });
  });

  it("rejects an inactive Firestore account", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser({ intendedProgram: null, status: "disabled" }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("ACCOUNT_INACTIVE");
  });

  it("rejects a disabled Firebase Auth account", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser({ intendedProgram: null }),
      auth: { ...verifiedAuth, disabled: true },
      now,
    });

    expect(result.reason).toBe("ACCOUNT_DISABLED");
  });

  it("rejects a missing or mismatched verified email", () => {
    expect(
      isProfileReminderEligible({
        reminder: pendingReminder(),
        user: completeUser({ intendedProgram: null }),
        auth: { ...verifiedAuth, email: null },
        now,
      }).reason,
    ).toBe("EMAIL_MISSING");
    expect(
      isProfileReminderEligible({
        reminder: pendingReminder(),
        user: completeUser({ intendedProgram: null }),
        auth: { ...verifiedAuth, email: "other@example.com" },
        now,
      }).reason,
    ).toBe("EMAIL_MISMATCH");
  });

  it("never resends a reminder already marked SENT", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder({ status: "SENT" }),
      user: completeUser({ intendedProgram: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("ALREADY_SENT");
  });

  it("skips a concurrent worker while the lease is active", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder({
        status: "PROCESSING",
        leaseExpiresAt: new Date(now.getTime() + 60_000),
      }),
      user: completeUser({ intendedProgram: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("LEASE_ACTIVE");
  });

  it("allows crash recovery after an expired processing lease", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder({
        status: "PROCESSING",
        leaseExpiresAt: new Date(now.getTime() - 60_000),
      }),
      user: completeUser({ intendedProgram: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });

  it("stops after the bounded maximum attempt count", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder({ attemptCount: PROFILE_REMINDER_MAX_ATTEMPTS }),
      user: completeUser({ intendedProgram: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("MAX_ATTEMPTS_REACHED");
  });

  it("does not process a reminder before its stable due date", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder({
        dueAt: new Date(now.getTime() + 60_000),
        nextAttemptAt: new Date(now.getTime() + 60_000),
      }),
      user: completeUser({ intendedProgram: null }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("NOT_DUE");
  });

  it("respects a known bounce or suppression marker", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser({ intendedProgram: null, emailSuppressed: true }),
      auth: verifiedAuth,
      now,
    });

    expect(result.reason).toBe("EMAIL_SUPPRESSED");
  });

  it("treats the reminder as transactional regardless of marketing consent", () => {
    const result = isProfileReminderEligible({
      reminder: pendingReminder(),
      user: completeUser({ intendedProgram: null, marketingConsent: false }),
      auth: verifiedAuth,
      now,
    });

    expect(result).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });
});
