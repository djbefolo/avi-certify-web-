import type {
  CanonicalLead,
  CanonicalLeadCrmStatus,
  CanonicalLeadSource,
} from "@/types/lead";

const canonicalStatuses = new Set<CanonicalLeadCrmStatus>([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
]);

const canonicalSources = new Set<CanonicalLeadSource>([
  "PUBLIC_CONTACT_FORM",
  "GUIDE_DOWNLOAD",
  "PRICING",
  "SIGNUP",
  "PROFILE",
  "UNKNOWN",
]);

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function explicitBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function isoStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value.trim() : date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return (value.toDate() as Date).toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1_000).toISOString();
  }

  return null;
}

export function normalizeLeadEmail(value: unknown): string | null {
  const email = stringOrNull(value);

  return email ? email.toLowerCase() : null;
}

export function normalizeLeadStatus(value: unknown): CanonicalLeadCrmStatus {
  const status = stringOrNull(value)?.toUpperCase();

  return canonicalStatuses.has(status as CanonicalLeadCrmStatus)
    ? (status as CanonicalLeadCrmStatus)
    : "NEW";
}

export function normalizeLeadSource(value: unknown): CanonicalLeadSource {
  const source = stringOrNull(value);
  const canonicalSource = source?.toUpperCase();

  if (canonicalSources.has(canonicalSource as CanonicalLeadSource)) {
    return canonicalSource as CanonicalLeadSource;
  }

  switch (source?.toLowerCase()) {
    case "landing_page":
    case "contact":
      return "PUBLIC_CONTACT_FORM";
    case "guide":
      return "GUIDE_DOWNLOAD";
    case "pricing":
      return "PRICING";
    case "signup":
      return "SIGNUP";
    case "profile":
      return "PROFILE";
    default:
      return "UNKNOWN";
  }
}

export function normalizeLead(
  documentId: string,
  raw: Record<string, unknown>,
): CanonicalLead {
  const rawSource = stringOrNull(raw.source);
  const rawStatus = stringOrNull(raw.crmStatus) ?? stringOrNull(raw.status);
  const email = stringOrNull(raw.email);
  const explicitContactConsent = explicitBoolean(raw.contactConsent);
  const legacyContactConsent = explicitBoolean(raw.consentAccepted);

  return {
    id: stringOrNull(raw.id) ?? documentId,
    fullName: stringOrNull(raw.fullName),
    email,
    normalizedEmail:
      normalizeLeadEmail(raw.normalizedEmail) ?? normalizeLeadEmail(email),
    phone: stringOrNull(raw.phone),
    residenceCountry:
      stringOrNull(raw.residenceCountry) ?? stringOrNull(raw.country),
    destinationCountry: stringOrNull(raw.destinationCountry),
    requestedService:
      stringOrNull(raw.requestedService) ?? stringOrNull(raw.serviceInterest),
    projectHorizon: stringOrNull(raw.projectHorizon),
    message: stringOrNull(raw.message),
    source: normalizeLeadSource(raw.source),
    sourceDetail:
      stringOrNull(raw.sourceDetail) ?? stringOrNull(raw.origin) ?? rawSource,
    utmSource: stringOrNull(raw.utmSource),
    utmMedium: stringOrNull(raw.utmMedium),
    utmCampaign: stringOrNull(raw.utmCampaign),
    utmContent: stringOrNull(raw.utmContent),
    utmTerm: stringOrNull(raw.utmTerm),
    crmStatus: normalizeLeadStatus(rawStatus),
    marketingConsent: explicitBoolean(raw.marketingConsent) ?? false,
    contactConsent:
      explicitContactConsent ?? legacyContactConsent ?? false,
    createdAt: isoStringOrNull(raw.createdAt),
    updatedAt: isoStringOrNull(raw.updatedAt),
    linkedUid: stringOrNull(raw.linkedUid),
    linkedAt: isoStringOrNull(raw.linkedAt),
    linkMethod: stringOrNull(raw.linkMethod),
    rawSource,
    rawStatus,
  };
}
