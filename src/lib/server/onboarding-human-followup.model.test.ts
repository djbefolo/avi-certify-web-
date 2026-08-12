import { describe, expect, it } from "vitest";
import {
  HUMAN_FOLLOW_UP_ADMIN_SOURCE,
  HUMAN_FOLLOW_UP_DELAY_MS,
  HUMAN_FOLLOW_UP_REASON,
  HUMAN_FOLLOW_UP_SOURCE,
  canClearSystemHumanFollowUp,
  decideHumanFollowUpAssignment,
  humanFollowUpDueAt,
  humanFollowUpEscalationEventId,
  humanFollowUpNotificationId,
  humanFollowUpResolutionEventId,
  isHumanFollowUpEligible,
  resolveHumanFollowUpIdentity,
} from "@/lib/server/onboarding-human-followup.model";
import { PROFILE_REMINDER_TEMPLATE } from "@/lib/server/onboarding-profile-reminder.model";

const sentAt = new Date("2026-08-08T09:00:00.000Z");
const dueAt = humanFollowUpDueAt(sentAt);
const now = new Date("2026-08-11T09:00:00.000Z");

function incompleteUser(overrides: Record<string, unknown> = {}) {
  return {
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

function reminder(overrides: Record<string, unknown> = {}) {
  return {
    uid: "user-1",
    template: PROFILE_REMINDER_TEMPLATE,
    recipient: "awa@example.com",
    status: "SENT",
    sentAt,
    humanFollowUpStatus: "PENDING",
    humanFollowUpDueAt: dueAt,
    ...overrides,
  };
}

const auth = {
  disabled: false,
  emailVerified: true,
  email: "awa@example.com",
};

describe("onboarding human follow-up eligibility", () => {
  it("uses an exact 72-hour delay from the reminder sentAt", () => {
    expect(HUMAN_FOLLOW_UP_DELAY_MS).toBe(72 * 60 * 60 * 1000);
    expect(dueAt.toISOString()).toBe("2026-08-11T09:00:00.000Z");
  });

  it("accepts an incomplete active verified profile exactly at 72 hours", () => {
    expect(
      isHumanFollowUpEligible({
        reminder: reminder(),
        user: incompleteUser(),
        auth,
        now,
      }),
    ).toEqual({ eligible: true, reason: "ELIGIBLE" });
  });

  it.each([
    ["missing reminder", null, incompleteUser(), auth, "INVALID_REMINDER"],
    ["wrong template", reminder({ template: "other" }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["reminder not sent", reminder({ status: "FAILED" }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["missing sentAt", reminder({ sentAt: null }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["missing follow-up dueAt", reminder({ humanFollowUpDueAt: null }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["early follow-up dueAt", reminder({ humanFollowUpDueAt: new Date(sentAt.getTime() + 1000) }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["already active", reminder({ humanFollowUpStatus: "ACTIVE" }), incompleteUser(), auth, "INVALID_REMINDER"],
    ["before threshold", reminder(), incompleteUser(), auth, "NOT_DUE"],
    ["missing user", reminder(), null, auth, "ACCOUNT_MISSING"],
    ["inactive user", reminder(), incompleteUser({ status: "disabled" }), auth, "ACCOUNT_INACTIVE"],
    ["disabled auth", reminder(), incompleteUser(), { ...auth, disabled: true }, "ACCOUNT_DISABLED"],
    ["unverified profile", reminder(), incompleteUser({ emailVerifiedAt: null }), auth, "EMAIL_UNVERIFIED"],
    ["unverified auth", reminder(), incompleteUser(), { ...auth, emailVerified: false }, "EMAIL_UNVERIFIED"],
    ["missing auth email", reminder(), incompleteUser(), { ...auth, email: null }, "EMAIL_MISSING"],
    ["missing recipient", reminder({ recipient: null }), incompleteUser(), auth, "EMAIL_MISSING"],
    ["email mismatch", reminder(), incompleteUser(), { ...auth, email: "other@example.com" }, "EMAIL_MISMATCH"],
    ["complete profile", reminder(), incompleteUser({ intendedProgram: "Master" }), auth, "PROFILE_COMPLETE"],
  ])("rejects %s", (_label, reminderData, user, authState, reason) => {
    const checkNow =
      _label === "before threshold"
        ? new Date("2026-08-11T08:59:59.999Z")
        : now;
    expect(
      isHumanFollowUpEligible({
        reminder: reminderData as Record<string, unknown> | null,
        user: user as Record<string, unknown> | null,
        auth: authState as typeof auth,
        now: checkNow,
      }),
    ).toEqual({ eligible: false, reason });
  });

  it("normalizes email case for the verified identity comparison", () => {
    expect(
      isHumanFollowUpEligible({
        reminder: reminder({ recipient: "AWA@EXAMPLE.COM" }),
        user: incompleteUser(),
        auth,
        now,
      }).eligible,
    ).toBe(true);
  });
});

describe("safe follow-up identity resolution", () => {
  const candidate = (
    id: string,
    data: Record<string, unknown>,
  ) => ({ id, data });

  it.each([
    ["no lead", [], "NO_LEAD", null],
    ["one linked lead", [candidate("lead-1", { linkedUid: "user-1", identityLinkStatus: "LINKED" })], "LINKED", "lead-1"],
    ["unlinked lead", [candidate("lead-1", { linkedUid: null, identityLinkStatus: "UNLINKED" })], "UNLINKED", null],
    ["ambiguous lead", [candidate("lead-1", { identityLinkStatus: "AMBIGUOUS" })], "AMBIGUOUS", null],
    ["conflicting status", [candidate("lead-1", { linkedUid: "user-1", identityLinkStatus: "CONFLICT" })], "CONFLICT", null],
    ["different uid", [candidate("lead-1", { linkedUid: "user-2", identityLinkStatus: "LINKED" })], "CONFLICT", null],
    ["missing identity status", [candidate("lead-1", { linkedUid: "user-1" })], "CONFLICT", null],
    ["two leads", [candidate("lead-1", {}), candidate("lead-2", {})], "MULTIPLE_LEADS", null],
    ["three leads", [candidate("lead-1", {}), candidate("lead-2", {}), candidate("lead-3", {})], "MULTIPLE_LEADS", null],
    ["deduplicated candidate", [candidate("lead-1", { linkedUid: "user-1", identityLinkStatus: "LINKED" }), candidate("lead-1", { linkedUid: "user-1", identityLinkStatus: "LINKED" })], "LINKED", "lead-1"],
  ])("classifies %s", (_label, candidates, resolution, leadId) => {
    const result = resolveHumanFollowUpIdentity("user-1", candidates);
    expect(result.resolution).toBe(resolution);
    expect(result.lead?.id ?? null).toBe(leadId);
  });
});

describe("human next-action protection", () => {
  it.each([
    ["empty legacy lead", { nextAction: "NONE" }, "ASSIGN"],
    ["empty system slot", { nextAction: "NONE", nextActionSource: HUMAN_FOLLOW_UP_SOURCE }, "ASSIGN"],
    ["existing system action", { nextAction: "FOLLOW_UP", nextActionSource: HUMAN_FOLLOW_UP_SOURCE, followUpReason: HUMAN_FOLLOW_UP_REASON }, "ALREADY_ASSIGNED"],
    ["human follow-up", { nextAction: "FOLLOW_UP", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE }, "PRESERVE_HUMAN_ACTION"],
    ["human none override", { nextAction: "NONE", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE }, "PRESERVE_HUMAN_ACTION"],
    ["legacy action", { nextAction: "CALL_PROSPECT" }, "PRESERVE_OTHER_ACTION"],
    ["legacy human reason", { nextAction: "NONE", followUpReason: "Rappeler mardi" }, "PRESERVE_OTHER_ACTION"],
    ["foreign system action", { nextAction: "NONE", nextActionSource: "SYSTEM_OTHER" }, "PRESERVE_OTHER_ACTION"],
  ])("handles %s", (_label, lead, decision) => {
    expect(decideHumanFollowUpAssignment(lead)).toBe(decision);
  });

  it("clears only the exact system-owned profile follow-up", () => {
    expect(
      canClearSystemHumanFollowUp({
        nextAction: "FOLLOW_UP",
        nextActionSource: HUMAN_FOLLOW_UP_SOURCE,
        followUpReason: HUMAN_FOLLOW_UP_REASON,
      }),
    ).toBe(true);
  });

  it.each([
    [null],
    [{ nextAction: "FOLLOW_UP", nextActionSource: HUMAN_FOLLOW_UP_ADMIN_SOURCE, followUpReason: HUMAN_FOLLOW_UP_REASON }],
    [{ nextAction: "CALL_PROSPECT", nextActionSource: HUMAN_FOLLOW_UP_SOURCE, followUpReason: HUMAN_FOLLOW_UP_REASON }],
    [{ nextAction: "FOLLOW_UP", nextActionSource: HUMAN_FOLLOW_UP_SOURCE, followUpReason: "OTHER" }],
  ])("does not clear a non-system-owned action %#", (lead) => {
    expect(canClearSystemHumanFollowUp(lead)).toBe(false);
  });
});

describe("deterministic follow-up identifiers", () => {
  it("creates a stable admin notification id", () => {
    expect(humanFollowUpNotificationId("user-1")).toBe(
      "profile_human_followup_user-1",
    );
  });

  it("creates a stable escalation audit id", () => {
    expect(humanFollowUpEscalationEventId("user-1")).toBe(
      "profile_human_followup_escalated_user-1",
    );
  });

  it("creates a distinct stable resolution audit id", () => {
    expect(humanFollowUpResolutionEventId("user-1")).toBe(
      "profile_human_followup_resolved_user-1",
    );
  });
});
