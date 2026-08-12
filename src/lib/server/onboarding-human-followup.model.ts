import {
  PROFILE_REMINDER_TEMPLATE,
  isProfileCompleteForReminder,
  reminderTimestampToMillis,
} from "@/lib/server/onboarding-profile-reminder.model";

export const HUMAN_FOLLOW_UP_DELAY_MS = 72 * 60 * 60 * 1000;
export const HUMAN_FOLLOW_UP_BATCH_SIZE = 25;
export const HUMAN_FOLLOW_UP_QUERY_LIMIT = 3;
export const HUMAN_FOLLOW_UP_REASON =
  "PROFILE_INCOMPLETE_AFTER_REMINDER" as const;
export const HUMAN_FOLLOW_UP_SOURCE =
  "SYSTEM_PROFILE_REMINDER" as const;
export const HUMAN_FOLLOW_UP_ADMIN_SOURCE = "HUMAN_ADMIN" as const;
export const HUMAN_FOLLOW_UP_NEXT_ACTION = "FOLLOW_UP" as const;

export type HumanFollowUpStatus =
  | "PENDING"
  | "ACTIVE"
  | "RESOLVED"
  | "CANCELLED";

export type HumanFollowUpEligibilityReason =
  | "ELIGIBLE"
  | "INVALID_REMINDER"
  | "NOT_DUE"
  | "ALREADY_HANDLED"
  | "ACCOUNT_MISSING"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_DISABLED"
  | "EMAIL_UNVERIFIED"
  | "EMAIL_MISSING"
  | "EMAIL_MISMATCH"
  | "PROFILE_COMPLETE";

export type HumanFollowUpIdentityResolution =
  | "LINKED"
  | "NO_LEAD"
  | "UNLINKED"
  | "AMBIGUOUS"
  | "CONFLICT"
  | "MULTIPLE_LEADS";

export type HumanFollowUpAssignmentDecision =
  | "ASSIGN"
  | "ALREADY_ASSIGNED"
  | "PRESERVE_HUMAN_ACTION"
  | "PRESERVE_OTHER_ACTION";

type AuthState = {
  disabled: boolean;
  emailVerified: boolean;
  email: string | null;
};

type EligibilityInput = {
  reminder: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  auth: AuthState;
  now: Date;
};

export type HumanFollowUpLeadCandidate = {
  id: string;
  data: Record<string, unknown>;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function humanFollowUpDueAt(sentAt: Date) {
  return new Date(sentAt.getTime() + HUMAN_FOLLOW_UP_DELAY_MS);
}

export function humanFollowUpNotificationId(uid: string) {
  return `profile_human_followup_${uid}`;
}

export function humanFollowUpEscalationEventId(uid: string) {
  return `profile_human_followup_escalated_${uid}`;
}

export function humanFollowUpResolutionEventId(uid: string) {
  return `profile_human_followup_resolved_${uid}`;
}

export function isHumanFollowUpEligible(
  input: EligibilityInput,
): { eligible: boolean; reason: HumanFollowUpEligibilityReason } {
  const { reminder, user, auth, now } = input;
  const sentAt = reminderTimestampToMillis(reminder?.sentAt);
  const dueAt = reminderTimestampToMillis(reminder?.humanFollowUpDueAt);

  if (
    !reminder ||
    reminder.template !== PROFILE_REMINDER_TEMPLATE ||
    reminder.status !== "SENT" ||
    !safeString(reminder.uid) ||
    reminder.humanFollowUpStatus !== "PENDING" ||
    sentAt === 0 ||
    dueAt === 0 ||
    dueAt < sentAt + HUMAN_FOLLOW_UP_DELAY_MS
  ) {
    return { eligible: false, reason: "INVALID_REMINDER" };
  }

  if (dueAt > now.getTime()) {
    return { eligible: false, reason: "NOT_DUE" };
  }

  if (!user) {
    return { eligible: false, reason: "ACCOUNT_MISSING" };
  }

  if (user.status !== "active") {
    return { eligible: false, reason: "ACCOUNT_INACTIVE" };
  }

  if (auth.disabled) {
    return { eligible: false, reason: "ACCOUNT_DISABLED" };
  }

  if (!user.emailVerifiedAt || !auth.emailVerified) {
    return { eligible: false, reason: "EMAIL_UNVERIFIED" };
  }

  const recipient = safeString(reminder.recipient)?.toLowerCase() ?? null;
  const authEmail = safeString(auth.email)?.toLowerCase() ?? null;

  if (!recipient || !authEmail) {
    return { eligible: false, reason: "EMAIL_MISSING" };
  }

  if (recipient !== authEmail) {
    return { eligible: false, reason: "EMAIL_MISMATCH" };
  }

  if (isProfileCompleteForReminder(user)) {
    return { eligible: false, reason: "PROFILE_COMPLETE" };
  }

  return { eligible: true, reason: "ELIGIBLE" };
}

export function resolveHumanFollowUpIdentity<
  TCandidate extends HumanFollowUpLeadCandidate,
>(
  uid: string,
  candidates: TCandidate[],
): {
  resolution: HumanFollowUpIdentityResolution;
  lead: TCandidate | null;
} {
  const unique = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const resolved = [...unique.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );

  if (resolved.length === 0) {
    return { resolution: "NO_LEAD", lead: null };
  }

  if (resolved.length > 1) {
    return { resolution: "MULTIPLE_LEADS", lead: null };
  }

  const lead = resolved[0];
  const linkedUid = safeString(lead.data.linkedUid);
  const identityStatus = safeString(lead.data.identityLinkStatus)?.toUpperCase();

  if (identityStatus === "AMBIGUOUS") {
    return { resolution: "AMBIGUOUS", lead: null };
  }

  if (identityStatus === "CONFLICT" || (linkedUid && linkedUid !== uid)) {
    return { resolution: "CONFLICT", lead: null };
  }

  if (!linkedUid) {
    return { resolution: "UNLINKED", lead: null };
  }

  if (linkedUid === uid && identityStatus === "LINKED") {
    return { resolution: "LINKED", lead };
  }

  return { resolution: "CONFLICT", lead: null };
}

export function decideHumanFollowUpAssignment(
  lead: Record<string, unknown>,
): HumanFollowUpAssignmentDecision {
  const nextAction = safeString(lead.nextAction) ?? "NONE";
  const source = safeString(lead.nextActionSource);
  const reason = safeString(lead.followUpReason);

  if (source === HUMAN_FOLLOW_UP_ADMIN_SOURCE) {
    return "PRESERVE_HUMAN_ACTION";
  }

  if (
    source === HUMAN_FOLLOW_UP_SOURCE &&
    nextAction === HUMAN_FOLLOW_UP_NEXT_ACTION &&
    reason === HUMAN_FOLLOW_UP_REASON
  ) {
    return "ALREADY_ASSIGNED";
  }

  if (
    nextAction !== "NONE" ||
    (source && source !== HUMAN_FOLLOW_UP_SOURCE) ||
    (reason && source !== HUMAN_FOLLOW_UP_SOURCE)
  ) {
    return "PRESERVE_OTHER_ACTION";
  }

  return "ASSIGN";
}

export function canClearSystemHumanFollowUp(
  lead: Record<string, unknown> | null,
) {
  return Boolean(
    lead &&
      lead.nextAction === HUMAN_FOLLOW_UP_NEXT_ACTION &&
      lead.followUpReason === HUMAN_FOLLOW_UP_REASON &&
      lead.nextActionSource === HUMAN_FOLLOW_UP_SOURCE,
  );
}
