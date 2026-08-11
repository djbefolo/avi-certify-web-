import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  normalizeLead as normalizeCanonicalLead,
  normalizeLeadStatus,
} from "@/lib/leads/normalize-lead";
import {
  canTransitionLeadCrmStatus,
  deriveLeadQualificationReadiness,
} from "@/lib/leads/crm-qualification";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type {
  AdminLead,
  AdminLeadLostReason,
  AdminLeadNextAction,
  AdminLeadNextActionSource,
  AdminLeadCrmPriority,
  AdminLeadCrmStatus,
  AdminLeadStats,
  AdminLeadUpdateInput,
  AdminLeadQualificationReason,
} from "@/types/admin-crm";
import type { CanonicalLeadCrmStatus } from "@/types/lead";

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

const nextActionValues = [
  "NONE",
  "CALL_PROSPECT",
  "WHATSAPP_PROSPECT",
  "EMAIL_PROSPECT",
  "REQUEST_INFORMATION",
  "REVIEW_PROFILE",
  "REVIEW_AMBIGUOUS_LINK",
  "FOLLOW_UP",
] as const satisfies readonly AdminLeadNextAction[];

const nextActionSourceValues = [
  "HUMAN_ADMIN",
  "SYSTEM_PROFILE_REMINDER",
] as const satisfies readonly AdminLeadNextActionSource[];

const lostReasonValues = [
  "NO_RESPONSE",
  "NOT_INTERESTED",
  "NOT_ELIGIBLE",
  "DUPLICATE",
  "OUT_OF_SCOPE",
  "OTHER",
] as const satisfies readonly AdminLeadLostReason[];

const allowedUpdateKeys = new Set([
  "crmStatus",
  "crmPriority",
  "crmOwner",
  "crmNotes",
  "lastContactedAt",
  "lostReason",
  "nextAction",
  "nextActionDueAt",
  "followUpReason",
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

function normalizeQualificationReasons(
  value: unknown,
): AdminLeadQualificationReason[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set<AdminLeadQualificationReason>([
    "CONTACT_AVAILABLE",
    "PHONE_AVAILABLE",
    "DESTINATION_KNOWN",
    "REQUESTED_SERVICE_KNOWN",
    "PROJECT_HORIZON_KNOWN",
    "IDENTITY_LINKED",
  ]);

  return value.filter(
    (reason): reason is AdminLeadQualificationReason =>
      typeof reason === "string" &&
      allowed.has(reason as AdminLeadQualificationReason),
  );
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

function normalizeCrmStatus(
  value: CanonicalLeadCrmStatus,
): AdminLeadCrmStatus {
  return value.toLowerCase() as AdminLeadCrmStatus;
}

function normalizeCrmPriority(value: unknown): AdminLeadCrmPriority {
  return crmPriorityValues.includes(value as AdminLeadCrmPriority)
    ? (value as AdminLeadCrmPriority)
    : "normal";
}

function normalizeAdminLead(
  docId: string,
  raw: Record<string, unknown>,
  linkedProfile: Record<string, unknown> | null = null,
): AdminLead {
  const timestamp = now();
  const canonical = normalizeCanonicalLead(docId, raw);
  const createdAt = canonical.createdAt ?? timestamp;
  const updatedAt = canonical.updatedAt ?? createdAt;
  const crmStatus = normalizeCrmStatus(canonical.crmStatus);
  const lastContactedAt = toIsoString(raw.lastContactedAt, "") || null;
  const readiness = deriveLeadQualificationReadiness(
    { ...canonical, crmStatus, lastContactedAt },
    linkedProfile,
  );
  const nextAction = nextActionValues.includes(
    raw.nextAction as AdminLeadNextAction,
  )
    ? (raw.nextAction as AdminLeadNextAction)
    : "NONE";
  const nextActionSource = nextActionSourceValues.includes(
    raw.nextActionSource as AdminLeadNextActionSource,
  )
    ? (raw.nextActionSource as AdminLeadNextActionSource)
    : null;
  const followUpReason = toStringOrNull(raw.followUpReason);
  const systemProfileFollowUpRequired =
    nextAction === "FOLLOW_UP" &&
    nextActionSource === "SYSTEM_PROFILE_REMINDER" &&
    followUpReason === "PROFILE_INCOMPLETE_AFTER_REMINDER";

  return {
    ...canonical,
    fullName: readiness.resolved.fullName ?? "Prospect sans nom",
    email: readiness.resolved.email ?? "",
    phone: readiness.resolved.phone,
    residenceCountry: readiness.resolved.residenceCountry,
    destinationCountry: readiness.resolved.destinationCountry,
    requestedService: readiness.resolved.requestedService,
    projectHorizon: readiness.resolved.projectHorizon,
    country: readiness.resolved.residenceCountry,
    serviceInterest: readiness.resolved.requestedService,
    origin: toStringOrNull(raw.origin),
    status: canonical.rawStatus,
    referrer: toStringOrNull(raw.referrer),
    guideRequested: toBoolean(raw.guideRequested),
    guideDelivered: toBoolean(raw.guideDelivered),
    guideDeliveryStatus: toStringOrNull(raw.guideDeliveryStatus),
    guideDeliveryChannel: toStringOrNull(raw.guideDeliveryChannel),
    guideEmailSent: toOptionalBoolean(raw.guideEmailSent),
    guideEmailStatus: toStringOrNull(raw.guideEmailStatus),
    canonicalCrmStatus: canonical.crmStatus,
    crmStatus,
    crmPriority: normalizeCrmPriority(raw.crmPriority),
    crmOwner: toStringOrNull(raw.crmOwner),
    crmNotes: toStringOrNull(raw.crmNotes),
    lastContactedAt,
    qualifiedAt: toIsoString(raw.qualifiedAt, "") || null,
    qualifiedBy: toStringOrNull(raw.qualifiedBy),
    qualificationReasons: normalizeQualificationReasons(
      raw.qualificationReasons,
    ),
    convertedAt: toIsoString(raw.convertedAt, "") || null,
    lostReason: toStringOrNull(raw.lostReason),
    nextAction,
    nextActionDueAt: toIsoString(raw.nextActionDueAt, "") || null,
    followUpReason,
    nextActionSource,
    nextActionUpdatedAt: toIsoString(raw.nextActionUpdatedAt, "") || null,
    nextActionUpdatedBy: toStringOrNull(raw.nextActionUpdatedBy),
    qualificationReadiness: readiness.qualificationReadiness,
    qualificationMissingFields: readiness.qualificationMissingFields,
    profileReadiness: readiness.profileReadiness,
    profileCompletionPercent: readiness.profileCompletionPercent,
    linkedAccountEmailVerified:
      linkedProfile == null ? null : linkedProfile.emailVerifiedAt != null,
    humanFollowUpRequired:
      readiness.humanFollowUpRequired || systemProfileFollowUpRequired,
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
    if (
      input.lostReason != null &&
      !lostReasonValues.includes(input.lostReason as AdminLeadLostReason)
    ) {
      throw new AdminLeadValidationError("Invalid CRM lost reason.");
    }

    update.lostReason = input.lostReason as AdminLeadLostReason | null;
  }

  if ("nextAction" in input) {
    if (!nextActionValues.includes(input.nextAction as AdminLeadNextAction)) {
      throw new AdminLeadValidationError("Invalid CRM next action.");
    }

    update.nextAction = input.nextAction as AdminLeadNextAction;
  }

  if ("nextActionDueAt" in input) {
    update.nextActionDueAt = cleanIsoDate(input.nextActionDueAt);
  }

  if ("followUpReason" in input) {
    update.followUpReason = cleanText(input.followUpReason, 500);
  }

  if (update.nextAction === "NONE" && update.nextActionDueAt) {
    throw new AdminLeadValidationError(
      "A next action due date requires an actionable next action.",
    );
  }

  return update;
}

function enrichStatusTimestamps(
  update: AdminLeadUpdateInput,
  current: AdminLead,
  actor: AdminActor,
) {
  const timestamp = now();
  const enriched: Record<string, unknown> = {
    ...update,
    updatedAt: timestamp,
  };

  if (
    update.nextAction !== undefined ||
    update.nextActionDueAt !== undefined ||
    update.followUpReason !== undefined
  ) {
    enriched.nextActionSource = "HUMAN_ADMIN";
    enriched.nextActionUpdatedAt = timestamp;
    enriched.nextActionUpdatedBy = actor.uid;
  }

  if (update.crmStatus === "contacted" && !update.lastContactedAt) {
    enriched.lastContactedAt = current.lastContactedAt ?? timestamp;
  }

  if (update.crmStatus === "qualified" && !current.qualifiedAt) {
    enriched.qualifiedAt = timestamp;
    enriched.qualifiedBy = actor.uid;
    enriched.qualificationReasons = current.qualificationReasons.length
      ? current.qualificationReasons
      : deriveLeadQualificationReadiness(current).qualificationReasons;
  }

  if (update.crmStatus === "converted" && !current.convertedAt) {
    enriched.convertedAt = timestamp;
  }

  if (update.crmStatus === "lost" && update.lostReason === undefined) {
    enriched.lostReason = current.lostReason;
  }

  if (update.crmStatus === "lost") {
    enriched.nextAction = "NONE";
    enriched.nextActionDueAt = null;
  }

  if (update.nextAction === "NONE") {
    enriched.nextActionDueAt = null;
  }

  return enriched;
}

async function loadLinkedProfiles(
  rawLeads: Array<{ id: string; data: Record<string, unknown> }>,
) {
  const linkedUids = [
    ...new Set(
      rawLeads
        .map(({ data }) => toStringOrNull(data.linkedUid))
        .filter((uid): uid is string => Boolean(uid)),
    ),
  ];
  const profiles = new Map<string, Record<string, unknown>>();

  if (!linkedUids.length || !hasFirebaseAdminEnv()) {
    return profiles;
  }

  const db = getAdminFirestore();
  const snapshots = await db.getAll(
    ...linkedUids.map((uid) => db.collection("users").doc(uid)),
  );

  for (const snapshot of snapshots) {
    if (snapshot.exists) {
      profiles.set(snapshot.id, snapshot.data() as Record<string, unknown>);
    }
  }

  return profiles;
}

async function normalizeAdminLeads(
  rawLeads: Array<{ id: string; data: Record<string, unknown> }>,
) {
  const profiles = await loadLinkedProfiles(rawLeads);

  return rawLeads.map(({ id, data }) => {
    const linkedUid = toStringOrNull(data.linkedUid);

    return normalizeAdminLead(
      id,
      data,
      linkedUid ? profiles.get(linkedUid) ?? null : null,
    );
  });
}

export class AdminLeadsStore {
  async listLeads(options: { limit?: number; crmStatus?: string | null; query?: string | null } = {}) {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const ref = leadsCollection();
    const rawDocuments = ref
      ? (await ref.orderBy("createdAt", "desc").limit(limit).get()).docs.map(
          (doc) => ({
            id: doc.id,
            data: doc.data() as Record<string, unknown>,
          }),
        )
      : fallbackState.leads
          .map((lead) => ({
            id: toStringOrNull(lead.id) ?? "lead_local",
            data: lead,
          }))
          .sort(
            (a, b) =>
              Date.parse(toIsoString(b.data.createdAt, "")) -
              Date.parse(toIsoString(a.data.createdAt, "")),
          )
          .slice(0, limit);
    const rawLeads = await normalizeAdminLeads(rawDocuments);
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

      return lead
        ? (await normalizeAdminLeads([{ id: leadId, data: lead }]))[0]
        : null;
    }

    const snapshot = await ref.doc(leadId).get();

    if (!snapshot.exists) {
      return null;
    }

    return (
      await normalizeAdminLeads([
        {
          id: snapshot.id,
          data: snapshot.data() as Record<string, unknown>,
        },
      ])
    )[0];
  }

  async updateLeadCrm(
    leadId: string,
    input: Record<string, unknown>,
    actor: AdminActor,
  ) {
    const current = await this.getLead(leadId);

    if (!current) {
      throw new AdminLeadValidationError("Lead not found.", 404);
    }

    const update = validateUpdateInput(input);
    if (
      update.crmStatus &&
      !canTransitionLeadCrmStatus(current.crmStatus, update.crmStatus)
    ) {
      throw new AdminLeadValidationError(
        `CRM transition ${current.crmStatus} -> ${update.crmStatus} is not allowed.`,
      );
    }

    if (
      update.crmStatus === "lost" &&
      !update.lostReason &&
      !current.lostReason
    ) {
      throw new AdminLeadValidationError(
        "A structured lost reason is required.",
      );
    }

    if (
      update.nextActionDueAt &&
      (update.nextAction ?? current.nextAction) === "NONE"
    ) {
      throw new AdminLeadValidationError(
        "A next action due date requires an actionable next action.",
      );
    }

    const enriched = enrichStatusTimestamps(update, current, actor);
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

    const changedFields = Object.keys(enriched).filter(
      (key) =>
        key !== "updatedAt" &&
        JSON.stringify(current[key as keyof AdminLead]) !==
          JSON.stringify(enriched[key]),
    );

    if (changedFields.length) {
      await getAdminOperationsStore().createEvent({
        caseId: null,
        uid: current.linkedUid,
        actorType: "admin",
        actorId: actor.uid,
        actorRole: actor.role,
        eventType: "lead_crm_updated",
        eventLabel: "Prospect CRM mis à jour",
        eventPayload: {
          leadId,
          changedFields,
          fromCrmStatus: current.crmStatus,
          toCrmStatus: update.crmStatus ?? current.crmStatus,
          qualificationDecision:
            current.crmStatus !== "qualified" &&
            update.crmStatus === "qualified",
          lostDecision:
            current.crmStatus !== "lost" && update.crmStatus === "lost",
          nextAction: update.nextAction ?? current.nextAction,
        },
      });
    }

    const updatedLead = {
      ...current,
      ...enriched,
      canonicalCrmStatus:
        update.crmStatus === undefined
          ? current.canonicalCrmStatus
          : normalizeLeadStatus(update.crmStatus),
    } as AdminLead;
    const updatedReadiness = deriveLeadQualificationReadiness(updatedLead);

    return {
      ...updatedLead,
      humanFollowUpRequired: updatedReadiness.humanFollowUpRequired,
    };
  }
}

const adminLeadsStore = new AdminLeadsStore();

export function getAdminLeadsStore() {
  return adminLeadsStore;
}
