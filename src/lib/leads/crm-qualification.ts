import { coreProfileFields } from "@/types/student-profile";
import type {
  AdminLeadCrmStatus,
  AdminLeadNextAction,
  AdminLeadProfileReadiness,
  AdminLeadQualificationReadiness,
  AdminLeadQualificationReason,
} from "@/types/admin-crm";
import type { CanonicalLead } from "@/types/lead";

type ProfileData = Record<string, unknown> | null;

type ResolvedQualificationData = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  residenceCountry: string | null;
  destinationCountry: string | null;
  requestedService: string | null;
  projectHorizon: string | null;
};

const actionableNextActions = new Set<AdminLeadNextAction>([
  "CALL_PROSPECT",
  "WHATSAPP_PROSPECT",
  "EMAIL_PROSPECT",
  "REQUEST_INFORMATION",
  "REVIEW_PROFILE",
  "REVIEW_AMBIGUOUS_LINK",
  "FOLLOW_UP",
]);

const allowedTransitions: Record<
  AdminLeadCrmStatus,
  readonly AdminLeadCrmStatus[]
> = {
  new: ["new", "contacted", "lost"],
  contacted: ["contacted", "qualified", "lost"],
  qualified: ["qualified", "lost"],
  converted: ["converted"],
  lost: ["lost"],
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function profileName(profile: ProfileData) {
  const fullName = text(profile?.fullName);

  if (fullName) {
    return fullName;
  }

  return (
    [text(profile?.firstName), text(profile?.lastName)]
      .filter(Boolean)
      .join(" ")
      .trim() || null
  );
}

function profileField(profile: ProfileData, ...fields: string[]) {
  for (const field of fields) {
    const value = text(profile?.[field]);

    if (value) {
      return value;
    }
  }

  return null;
}

function resolveQualificationData(
  lead: Pick<
    CanonicalLead,
    | "fullName"
    | "email"
    | "phone"
    | "residenceCountry"
    | "destinationCountry"
    | "requestedService"
    | "projectHorizon"
  >,
  profile: ProfileData,
): ResolvedQualificationData {
  return {
    fullName: lead.fullName ?? profileName(profile),
    email: lead.email ?? profileField(profile, "email"),
    phone: lead.phone ?? profileField(profile, "phoneWhatsApp", "phone"),
    residenceCountry:
      lead.residenceCountry ??
      profileField(profile, "countryOfResidence", "residenceCountry"),
    destinationCountry:
      lead.destinationCountry ?? profileField(profile, "destinationCountry"),
    requestedService:
      lead.requestedService ??
      profileField(profile, "selectedService", "serviceInterest"),
    projectHorizon:
      lead.projectHorizon ??
      profileField(
        profile,
        "intendedArrivalDate",
        "intendedAcademicYear",
        "projectHorizon",
      ),
  };
}

function hasProfileValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function deriveProfileCompletion(profile: ProfileData) {
  if (!profile) {
    return { complete: false, percent: null };
  }

  const completed = coreProfileFields.filter((field) =>
    hasProfileValue(profile[field]),
  ).length;
  const percent = Math.round((completed / coreProfileFields.length) * 100);

  return { complete: completed === coreProfileFields.length, percent };
}

export function deriveLeadQualificationReadiness(
  lead: Pick<
    CanonicalLead,
    | "fullName"
    | "email"
    | "phone"
    | "residenceCountry"
    | "destinationCountry"
    | "requestedService"
    | "projectHorizon"
    | "linkedUid"
    | "identityLinkStatus"
  > & { crmStatus?: AdminLeadCrmStatus; lastContactedAt?: string | null },
  profile: ProfileData = null,
) {
  const resolved = resolveQualificationData(lead, profile);
  const required = [
    ["fullName", resolved.fullName],
    ["email", resolved.email],
    ["phone", resolved.phone],
    ["destinationCountry", resolved.destinationCountry],
    ["requestedService", resolved.requestedService],
  ] as const;
  const missingFields = required
    .filter(([, value]) => !value)
    .map(([field]) => field);
  const qualificationReadiness: AdminLeadQualificationReadiness =
    missingFields.length === 0 ? "READY_FOR_REVIEW" : "INCOMPLETE";
  const reasons: AdminLeadQualificationReason[] = [];

  if (resolved.email) reasons.push("CONTACT_AVAILABLE");
  if (resolved.phone) reasons.push("PHONE_AVAILABLE");
  if (resolved.destinationCountry) reasons.push("DESTINATION_KNOWN");
  if (resolved.requestedService) reasons.push("REQUESTED_SERVICE_KNOWN");
  if (resolved.projectHorizon) reasons.push("PROJECT_HORIZON_KNOWN");
  if (lead.linkedUid && lead.identityLinkStatus === "LINKED") {
    reasons.push("IDENTITY_LINKED");
  }

  const profileCompletion = deriveProfileCompletion(profile);
  const profileReadiness: AdminLeadProfileReadiness = profileCompletion.complete
    ? "COMPLETE"
    : profile && qualificationReadiness === "READY_FOR_REVIEW"
      ? "SUFFICIENT_FOR_QUALIFICATION"
      : "INCOMPLETE";
  const humanFollowUpRequired =
    lead.identityLinkStatus === "AMBIGUOUS" ||
    lead.identityLinkStatus === "CONFLICT" ||
    (qualificationReadiness === "READY_FOR_REVIEW" &&
      (lead.crmStatus ?? "new") === "new" &&
      !lead.lastContactedAt);

  return {
    resolved,
    qualificationReadiness,
    qualificationMissingFields: missingFields,
    qualificationReasons: reasons,
    profileReadiness,
    profileCompletionPercent: profileCompletion.percent,
    humanFollowUpRequired,
  };
}

export function canTransitionLeadCrmStatus(
  current: AdminLeadCrmStatus,
  next: AdminLeadCrmStatus,
) {
  return allowedTransitions[current].includes(next);
}

export function isActionableNextAction(value: AdminLeadNextAction) {
  return actionableNextActions.has(value);
}

export function isLeadNextActionOverdue(
  nextAction: AdminLeadNextAction,
  dueAt: string | null,
  currentTime = Date.now(),
) {
  if (!isActionableNextAction(nextAction) || !dueAt) {
    return false;
  }

  const dueTime = Date.parse(dueAt);

  return Number.isFinite(dueTime) && dueTime < currentTime;
}
