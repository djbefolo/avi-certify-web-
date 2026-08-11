import { coreProfileFields, type CoreProfileField } from "@/types/student-profile";

export const PROFILE_REMINDER_TEMPLATE = "onboarding_profile_reminder_24h";
export const PROFILE_REMINDER_IDEMPOTENCY_PREFIX =
  "onboarding_profile_reminder";
export const PROFILE_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
export const PROFILE_REMINDER_LEASE_MS = 10 * 60 * 1000;
export const PROFILE_REMINDER_RETRY_DELAY_MS = 30 * 60 * 1000;
export const PROFILE_REMINDER_MAX_ATTEMPTS = 3;
export const PROFILE_REMINDER_BATCH_SIZE = 25;

export type ProfileReminderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "CANCELLED";

export type ProfileReminderEligibilityReason =
  | "ELIGIBLE"
  | "INVALID_REMINDER"
  | "NOT_DUE"
  | "ALREADY_SENT"
  | "TERMINAL"
  | "LEASE_ACTIVE"
  | "MAX_ATTEMPTS_REACHED"
  | "ACCOUNT_MISSING"
  | "ACCOUNT_INACTIVE"
  | "ACCOUNT_DISABLED"
  | "EMAIL_UNVERIFIED"
  | "EMAIL_MISSING"
  | "EMAIL_MISMATCH"
  | "EMAIL_SUPPRESSED"
  | "PROFILE_COMPLETE";

type AuthReminderState = {
  disabled: boolean;
  emailVerified: boolean;
  email: string | null;
};

type EligibilityInput = {
  reminder: Record<string, unknown> | null;
  user: Record<string, unknown> | null;
  auth: AuthReminderState;
  now: Date;
};

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function reminderTimestampToMillis(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function getCanonicalProfileValue(
  data: Record<string, unknown>,
  field: CoreProfileField,
) {
  if (field === "birthDate") {
    return data.birthDate ?? data.dateOfBirth;
  }

  if (field === "countryOfResidence") {
    return data.countryOfResidence ?? data.residenceCountry;
  }

  return data[field];
}

function hasProfileValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function getProfileReminderMissingFields(
  user: Record<string, unknown> | null,
) {
  if (!user) {
    return [...coreProfileFields];
  }

  return coreProfileFields.filter(
    (field) => !hasProfileValue(getCanonicalProfileValue(user, field)),
  );
}

export function isProfileCompleteForReminder(
  user: Record<string, unknown> | null,
) {
  return getProfileReminderMissingFields(user).length === 0;
}

export function profileReminderCommunicationId(uid: string) {
  return `${PROFILE_REMINDER_IDEMPOTENCY_PREFIX}_${uid}_24h`;
}

export function profileReminderIdempotencyKey(uid: string) {
  return `${PROFILE_REMINDER_IDEMPOTENCY_PREFIX}:${uid}:24h`;
}

export function profileReminderDueAt(emailVerifiedAt: Date) {
  return new Date(emailVerifiedAt.getTime() + PROFILE_REMINDER_DELAY_MS);
}

export function buildProfileReminderSchedule(input: {
  uid: string;
  email: string;
  emailVerifiedAt: Date;
  user: Record<string, unknown> | null;
}) {
  if (isProfileCompleteForReminder(input.user)) {
    return null;
  }

  const dueAt = profileReminderDueAt(input.emailVerifiedAt);

  return {
    id: profileReminderCommunicationId(input.uid),
    caseId: null,
    uid: input.uid,
    type: "EMAIL" as const,
    template: PROFILE_REMINDER_TEMPLATE,
    recipient: input.email.trim().toLowerCase(),
    status: "PENDING" as const,
    provider: "resend" as const,
    messageId: null,
    providerMessageId: null,
    idempotencyKey: profileReminderIdempotencyKey(input.uid),
    attemptCount: 0,
    dueAt,
    nextAttemptAt: dueAt,
    lastAttemptAt: null,
    sentAt: null,
    failedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    error: null,
    leaseId: null,
    leaseExpiresAt: null,
  };
}

// No centralized Resend webhook exists yet. These read-only stop hooks let a
// future bounce/suppression synchronizer prevent sends without changing this flow.
function hasKnownEmailSuppression(user: Record<string, unknown>) {
  const deliveryStatus = safeString(user.emailDeliveryStatus)?.toUpperCase();

  return (
    user.emailSuppressed === true ||
    Boolean(user.emailSuppressedAt) ||
    Boolean(user.emailBounceAt) ||
    deliveryStatus === "BOUNCED" ||
    deliveryStatus === "SUPPRESSED" ||
    deliveryStatus === "COMPLAINED"
  );
}

export function isProfileReminderEligible(
  input: EligibilityInput,
): { eligible: boolean; reason: ProfileReminderEligibilityReason } {
  const { reminder, user, auth, now } = input;

  if (
    !reminder ||
    reminder.template !== PROFILE_REMINDER_TEMPLATE ||
    !safeString(reminder.uid) ||
    !safeString(reminder.idempotencyKey) ||
    reminderTimestampToMillis(reminder.dueAt) === 0
  ) {
    return { eligible: false, reason: "INVALID_REMINDER" };
  }

  if (reminder.status === "SENT") {
    return { eligible: false, reason: "ALREADY_SENT" };
  }

  if (reminder.status === "CANCELLED") {
    return { eligible: false, reason: "TERMINAL" };
  }

  const leaseIsActive =
    reminder.status === "PROCESSING" &&
    reminderTimestampToMillis(reminder.leaseExpiresAt) > now.getTime();

  if (leaseIsActive) {
    return { eligible: false, reason: "LEASE_ACTIVE" };
  }

  const attemptCount =
    typeof reminder.attemptCount === "number" ? reminder.attemptCount : 0;

  if (attemptCount >= PROFILE_REMINDER_MAX_ATTEMPTS) {
    return { eligible: false, reason: "MAX_ATTEMPTS_REACHED" };
  }

  if (
    reminderTimestampToMillis(reminder.dueAt) > now.getTime() ||
    reminderTimestampToMillis(reminder.nextAttemptAt) > now.getTime()
  ) {
    return { eligible: false, reason: "NOT_DUE" };
  }

  if (!user) {
    return { eligible: false, reason: "ACCOUNT_MISSING" };
  }

  if (user.status !== "active") {
    return { eligible: false, reason: "ACCOUNT_INACTIVE" };
  }

  if (!user.emailVerifiedAt) {
    return { eligible: false, reason: "EMAIL_UNVERIFIED" };
  }

  if (auth.disabled) {
    return { eligible: false, reason: "ACCOUNT_DISABLED" };
  }

  if (!auth.emailVerified) {
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

  if (hasKnownEmailSuppression(user)) {
    return { eligible: false, reason: "EMAIL_SUPPRESSED" };
  }

  if (isProfileCompleteForReminder(user)) {
    return { eligible: false, reason: "PROFILE_COMPLETE" };
  }

  return { eligible: true, reason: "ELIGIBLE" };
}
