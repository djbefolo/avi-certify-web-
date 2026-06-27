import { getAdminFirestore } from "@/lib/firebase/admin";
import type {
  AdminLead,
  AdminLeadCrmPriority,
  AdminLeadCrmStatus,
  AdminLeadStats,
  AdminLeadUpdateInput,
} from "@/types/admin-crm";

const LEADS_COLLECTION = "leads";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type AdminLeadsFallbackState = {
  leads: Array<Record<string, unknown>>;
};

const crmStatusValues = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
] as const satisfies readonly AdminLeadCrmStatus[];

const crmPriorityValues = [
  "low",
  "normal",
  "high",
] as const satisfies readonly AdminLeadCrmPriority[];

const allowedUpdateKeys = new Set([
  "crmStatus",
  "crmPriority",
  "crmOwner",
  "crmNotes",
  "lastContactedAt",
  "lostReason",
]);

declare global {
  var __aviAdminLeadsState: AdminLeadsFallbackState | undefined;
}

const fallbackState =
  globalThis.__aviAdminLeadsState ??
  (globalThis.__aviAdminLeadsState = {
    leads: [],
  });

let fallbackWarningLogged = false;

export class AdminLeadValidationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 = 400,
  ) {
    super(message);
  }
}

function now() {
  return new Date().toISOString();
}

function hasFirebaseAdminEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function assertLocalFallbackAllowed() {
  if (hasFirebaseAdminEnv()) {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase Admin configuration is required for admin CRM leads in production.",
    );
  }

  if (!fallbackWarningLogged && process.env.NODE_ENV !== "test") {
    console.warn(
      "AVI admin leads store is using process-local fallback storage. This is allowed only for development and tests.",
    );
    fallbackWarningLogged = true;
  }
}

function leadsCollection() {
  assertLocalFallbackAllowed();

  return hasFirebaseAdminEnv()
    ? getAdminFirestore().collection(LEADS_COLLECTION)
    : null;
}

function cleanText(value: unknown, maxLength: number) {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AdminLeadValidationError("Invalid CRM text field.");
  }

  const cleaned = value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return null;
  }

  if (cleaned.length > maxLength) {
    throw new AdminLeadValidationError("CRM text field is too long.");
  }

  return cleaned;
}

function cleanIsoDate(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new AdminLeadValidationError("Invalid CRM date field.");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AdminLeadValidationError("Invalid CRM date field.");
  }

  return date.toISOString();
}

function toStringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toBoolean(value: unknown) {
  return value === true;
}

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function toIsoString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value;
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
    const date = value.toDate() as Date;

    return date.toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return fallback;
}

function normalizeCrmStatus(value: unknown): AdminLeadCrmStatus {
  return crmStatusValues.includes(value as AdminLeadCrmStatus)
    ? (value as AdminLeadCrmStatus)
    : "new";
}

function normalizeCrmPriority(value: unknown): AdminLeadCrmPriority {
  return crmPriorityValues.includes(value as AdminLeadCrmPriority)
    ? (value as AdminLeadCrmPriority)
    : "normal";
}

function normalizeLead(docId: string, raw: Record<string, unknown>): AdminLead {
  const timestamp = now();
  const createdAt = toIsoString(raw.createdAt, timestamp);
  const updatedAt = toIsoString(raw.updatedAt, createdAt);

  return {
    id: toStringOrNull(raw.id) ?? docId,
    fullName: toStringOrNull(raw.fullName) ?? "Prospect sans nom",
    email: toStringOrNull(raw.email) ?? "",
    phone: toStringOrNull(raw.phone),
    country: toStringOrNull(raw.country),
    destinationCountry: toStringOrNull(raw.destinationCountry),
    serviceInterest: toStringOrNull(raw.serviceInterest),
    projectHorizon: toStringOrNull(raw.projectHorizon),
    source: toStringOrNull(raw.source) ?? "unknown",
    origin: toStringOrNull(raw.origin),
    status: toStringOrNull(raw.status),
    marketingConsent: toBoolean(raw.marketingConsent),
    utmSource: toStringOrNull(raw.utmSource),
    utmMedium: toStringOrNull(raw.utmMedium),
    utmCampaign: toStringOrNull(raw.utmCampaign),
    referrer: toStringOrNull(raw.referrer),
    guideRequested: toBoolean(raw.guideRequested),
    guideDelivered: toBoolean(raw.guideDelivered),
    guideDeliveryStatus: toStringOrNull(raw.guideDeliveryStatus),
    guideDeliveryChannel: toStringOrNull(raw.guideDeliveryChannel),
    guideEmailSent: toOptionalBoolean(raw.guideEmailSent),
    guideEmailStatus: toStringOrNull(raw.guideEmailStatus),
    crmStatus: normalizeCrmStatus(raw.crmStatus),
    crmPriority: normalizeCrmPriority(raw.crmPriority),
    crmOwner: toStringOrNull(raw.crmOwner),
    crmNotes: toStringOrNull(raw.crmNotes),
    lastContactedAt: toIsoString(raw.lastContactedAt, "") || null,
    qualifiedAt: toIsoString(raw.qualifiedAt, "") || null,
    convertedAt: toIsoString(raw.convertedAt, "") || null,
    lostReason: toStringOrNull(raw.lostReason),
    createdAt,
    updatedAt,
  };
}

export function summarizeAdminLeads(leads: AdminLead[]): AdminLeadStats {
  return {
    total: leads.length,
    new: leads.filter((lead) => lead.crmStatus === "new").length,
    contacted: leads.filter((lead) => lead.crmStatus === "contacted").length,
    qualified: leads.filter((lead) => lead.crmStatus === "qualified").length,
    converted: leads.filter((lead) => lead.crmStatus === "converted").length,
    lost: leads.filter((lead) => lead.crmStatus === "lost").length,
    guideSucceeded: leads.filter(
      (lead) =>
        lead.guideDeliveryStatus === "READY" ||
        lead.guideEmailStatus === "SENT",
    ).length,
    guideEmailFailures: leads.filter(
      (lead) =>
        lead.guideEmailStatus === "SEND_FAILED" ||
        lead.guideEmailStatus === "RECIPIENT_MISSING",
    ).length,
  };
}

function validateUpdateInput(input: Record<string, unknown>) {
  const illegalKeys = Object.keys(input).filter((key) => !allowedUpdateKeys.has(key));

  if (illegalKeys.length) {
    throw new AdminLeadValidationError(
      `Unsupported CRM lead fields: ${illegalKeys.join(", ")}.`,
    );
  }

  const update: AdminLeadUpdateInput = {};

  if ("crmStatus" in input) {
    if (!crmStatusValues.includes(input.crmStatus as AdminLeadCrmStatus)) {
      throw new AdminLeadValidationError("Invalid CRM lead status.");
    }

    update.crmStatus = input.crmStatus as AdminLeadCrmStatus;
  }

  if ("crmPriority" in input) {
    if (!crmPriorityValues.includes(input.crmPriority as AdminLeadCrmPriority)) {
      throw new AdminLeadValidationError("Invalid CRM lead priority.");
    }

    update.crmPriority = input.crmPriority as AdminLeadCrmPriority;
  }

  if ("crmOwner" in input) {
    update.crmOwner = cleanText(input.crmOwner, 120);
  }

  if ("crmNotes" in input) {
    update.crmNotes = cleanText(input.crmNotes, 2_000);
  }

  if ("lastContactedAt" in input) {
    update.lastContactedAt = cleanIsoDate(input.lastContactedAt);
  }

  if ("lostReason" in input) {
    update.lostReason = cleanText(input.lostReason, 500);
  }

  return update;
}

function enrichStatusTimestamps(
  update: AdminLeadUpdateInput,
  current: AdminLead,
) {
  const timestamp = now();
  const enriched: Record<string, unknown> = {
    ...update,
    updatedAt: timestamp,
  };

  if (update.crmStatus === "contacted" && !update.lastContactedAt) {
    enriched.lastContactedAt = current.lastContactedAt ?? timestamp;
  }

  if (update.crmStatus === "qualified" && !current.qualifiedAt) {
    enriched.qualifiedAt = timestamp;
  }

  if (update.crmStatus === "converted" && !current.convertedAt) {
    enriched.convertedAt = timestamp;
  }

  if (update.crmStatus === "lost" && update.lostReason === undefined) {
    enriched.lostReason = current.lostReason;
  }

  return enriched;
}

export class AdminLeadsStore {
  async listLeads(options: { limit?: number; crmStatus?: string | null; query?: string | null } = {}) {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const ref = leadsCollection();
    const rawLeads = ref
      ? (await ref.orderBy("createdAt", "desc").limit(limit).get()).docs.map((doc) =>
          normalizeLead(doc.id, doc.data() as Record<string, unknown>),
        )
      : fallbackState.leads
          .map((lead) =>
            normalizeLead(toStringOrNull(lead.id) ?? "lead_local", lead),
          )
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, limit);
    const query = options.query?.trim().toLowerCase();
    const crmStatus = options.crmStatus?.trim();
    const leads = rawLeads.filter((lead) => {
        if (crmStatus && lead.crmStatus !== crmStatus) {
          return false;
        }

        if (
          query &&
          !`${lead.fullName} ${lead.email} ${lead.phone ?? ""}`.toLowerCase().includes(query)
        ) {
          return false;
        }

        return true;
      });

    return {
      leads,
      stats: summarizeAdminLeads(leads),
    };
  }

  async getLead(leadId: string) {
    const ref = leadsCollection();

    if (!ref) {
      const lead = fallbackState.leads.find((item) => item.id === leadId);

      return lead ? normalizeLead(leadId, lead) : null;
    }

    const snapshot = await ref.doc(leadId).get();

    if (!snapshot.exists) {
      return null;
    }

    return normalizeLead(snapshot.id, snapshot.data() as Record<string, unknown>);
  }

  async updateLeadCrm(leadId: string, input: Record<string, unknown>) {
    const current = await this.getLead(leadId);

    if (!current) {
      throw new AdminLeadValidationError("Lead not found.", 404);
    }

    const update = validateUpdateInput(input);
    const enriched = enrichStatusTimestamps(update, current);
    const ref = leadsCollection();

    if (ref) {
      await ref.doc(leadId).set(enriched, { merge: true });
    } else {
      const index = fallbackState.leads.findIndex((lead) => lead.id === leadId);

      if (index >= 0) {
        fallbackState.leads[index] = {
          ...fallbackState.leads[index],
          ...enriched,
        };
      }
    }

    return {
      ...current,
      ...enriched,
    } as AdminLead;
  }
}

const adminLeadsStore = new AdminLeadsStore();

export function getAdminLeadsStore() {
  return adminLeadsStore;
}
