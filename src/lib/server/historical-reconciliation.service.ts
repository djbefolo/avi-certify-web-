import "server-only";

import { createHash } from "node:crypto";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeLeadEmail } from "@/lib/leads/normalize-lead";
import type {
  HistoricalReconciliationApplyResult,
  HistoricalReconciliationClassification,
  HistoricalReconciliationCounts,
  HistoricalReconciliationItem,
  HistoricalReconciliationPlan,
} from "@/types/historical-reconciliation";

const LEADS = "leads";
const CLIENTS = "admin_client_profiles";
const CASES = "client_cases";
const PAYMENTS = "payments";
const EVENTS = "admin_case_events";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MATCH_LIMIT = 3;

type Raw = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function counts(): HistoricalReconciliationCounts {
  return {
    ALREADY_CORRECT: 0,
    SAFE_AUTO_RECONCILABLE: 0,
    MANUAL_REVIEW: 0,
    AMBIGUOUS: 0,
    CONFLICT: 0,
    INSUFFICIENT_DATA: 0,
    UNSUPPORTED_LEGACY: 0,
  };
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function reconciliationEventId(leadId: string) {
  return `historical_reconciliation_${digest(`lead:${leadId}`)}`;
}

function isAuthNotFound(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "auth/user-not-found",
  );
}

function item(
  leadId: string,
  classification: HistoricalReconciliationClassification,
  options: Partial<Omit<HistoricalReconciliationItem, "entityType" | "entityId" | "classification">> = {},
): HistoricalReconciliationItem {
  return {
    entityType: "lead",
    entityId: leadId,
    classification,
    confidence:
      classification === "SAFE_AUTO_RECONCILABLE" || classification === "ALREADY_CORRECT"
        ? "HIGH"
        : classification === "INSUFFICIENT_DATA"
          ? "LOW"
          : "MEDIUM",
    evidence: [],
    proposedChanges: [],
    blockingReasons: [],
    relatedEntities: { uid: null, clientId: null, caseIds: [], paymentIds: [] },
    requiresManualReview: ["MANUAL_REVIEW", "AMBIGUOUS", "CONFLICT"].includes(classification),
    ...options,
  };
}

async function relatedBusinessEvidence(uid: string) {
  const db = getAdminFirestore();
  const [client, cases, payments] = await Promise.all([
    db.collection(CLIENTS).doc(uid).get(),
    db.collection(CASES).where("uid", "==", uid).limit(MATCH_LIMIT).get(),
    db.collection(PAYMENTS).where("ownerId", "==", uid).limit(MATCH_LIMIT).get(),
  ]);
  const paid = payments.docs.filter((payment) => text(payment.get("status"))?.toLowerCase() === "paid");

  return {
    clientId: client.exists ? client.id : null,
    caseIds: cases.docs.map((record) => record.id),
    paymentIds: paid.map((record) => record.id),
  };
}

async function findSameEmailLeads(normalizedEmail: string) {
  const db = getAdminFirestore();
  const [canonical, legacy] = await Promise.all([
    db.collection(LEADS).where("normalizedEmail", "==", normalizedEmail).limit(MATCH_LIMIT).get(),
    db.collection(LEADS).where("email", "==", normalizedEmail).limit(MATCH_LIMIT).get(),
  ]);
  const matches = new Map<string, Raw>();
  for (const record of [...canonical.docs, ...legacy.docs]) {
    matches.set(record.id, record.data() as Raw);
  }
  return matches;
}

export async function inspectHistoricalLead(leadId: string, raw: Raw): Promise<HistoricalReconciliationItem> {
  const existingUid = text(raw.linkedUid);
  const linkStatus = text(raw.identityLinkStatus)?.toUpperCase();
  const email = normalizeLeadEmail(raw.normalizedEmail) ?? normalizeLeadEmail(raw.email);

  if (existingUid) {
    const business = await relatedBusinessEvidence(existingUid);
    if (linkStatus && linkStatus !== "LINKED") {
      return item(leadId, "CONFLICT", {
        evidence: [{ code: "LEAD_UID_PRESENT", strength: "STRONG", detail: "Le lead référence déjà un UID exact." }],
        blockingReasons: ["Le statut de rapprochement est incompatible avec le linkedUid existant."],
        relatedEntities: { uid: existingUid, ...business },
      });
    }
    return item(leadId, "ALREADY_CORRECT", {
      evidence: [{ code: "EXACT_LEAD_UID", strength: "STRONG", detail: "Le lead est déjà lié à un UID exact." }],
      relatedEntities: { uid: existingUid, ...business },
    });
  }

  if (!email) {
    return item(leadId, "INSUFFICIENT_DATA", {
      blockingReasons: ["Aucun email normalisable ni UID exact n’est disponible."],
    });
  }

  let authUser;
  try {
    authUser = await getAdminAuth().getUserByEmail(email);
  } catch (error) {
    if (isAuthNotFound(error)) {
      return item(leadId, "INSUFFICIENT_DATA", {
        evidence: [{ code: "NORMALIZED_EMAIL", strength: "MEDIUM", detail: "Email normalisé présent, sans compte Firebase correspondant." }],
        blockingReasons: ["Aucun UID Firebase exact ne peut être établi."],
      });
    }
    throw error;
  }

  if (!authUser.emailVerified) {
    return item(leadId, "MANUAL_REVIEW", {
      evidence: [{ code: "AUTH_EMAIL_UNVERIFIED", strength: "MEDIUM", detail: "Un compte Firebase existe mais son email n’est pas vérifié." }],
      blockingReasons: ["La règle canonique Phase 2B exige un email Firebase vérifié."],
      relatedEntities: { uid: authUser.uid, clientId: null, caseIds: [], paymentIds: [] },
    });
  }

  const sameEmailLeads = await findSameEmailLeads(email);
  if (sameEmailLeads.size !== 1 || !sameEmailLeads.has(leadId)) {
    return item(leadId, "AMBIGUOUS", {
      evidence: [{ code: "VERIFIED_AUTH_EMAIL", strength: "MEDIUM", detail: "UID Firebase associé à un email vérifié." }],
      blockingReasons: ["Plus d’un lead historique partage cet email ; aucun choix automatique n’est permis."],
      relatedEntities: { uid: authUser.uid, clientId: null, caseIds: [], paymentIds: [] },
    });
  }

  const business = await relatedBusinessEvidence(authUser.uid);
  return item(leadId, "SAFE_AUTO_RECONCILABLE", {
    evidence: [
      { code: "VERIFIED_AUTH_EMAIL", strength: "MEDIUM", detail: "UID Firebase associé à un email vérifié." },
      { code: "UNIQUE_EMAIL_LEAD", strength: "STRONG", detail: "Le lead est l’unique candidat pour cet email normalisé." },
    ],
    proposedChanges: [
      { field: "linkedUid", from: null, to: authUser.uid },
      { field: "identityLinkStatus", from: null, to: "LINKED" },
      { field: "linkMethod", from: null, to: "HISTORICAL_RECONCILIATION" },
    ],
    relatedEntities: { uid: authUser.uid, ...business },
  });
}

export async function buildHistoricalReconciliationPlan(input: { limit?: number; cursor?: string | null } = {}): Promise<HistoricalReconciliationPlan> {
  const limit = Math.max(1, Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const db = getAdminFirestore();
  let query = db.collection(LEADS).orderBy(FieldPath.documentId()).limit(limit);
  if (input.cursor) query = query.startAfter(input.cursor);
  const snapshot = await query.get();
  const items = await Promise.all(snapshot.docs.map((record) => inspectHistoricalLead(record.id, record.data() as Raw)));
  const summary = counts();
  for (const result of items) summary[result.classification] += 1;
  return {
    mode: "DRY_RUN",
    scope: "leads",
    inspected: items.length,
    nextCursor: snapshot.size === limit ? snapshot.docs.at(-1)?.id ?? null : null,
    counts: summary,
    items,
  };
}

/**
 * Intentionally not exposed through an HTTP route. It exists for controlled,
 * later-authorized operations only and applies the sole non-destructive safe
 * mutation: a deterministic Lead → UID link plus one immutable audit event.
 */
export async function applySafeHistoricalLeadReconciliation(input: { leadIds: string[]; runId: string }): Promise<HistoricalReconciliationApplyResult> {
  const db = getAdminFirestore();
  let applied = 0;
  let skipped = 0;
  const auditEventIds: string[] = [];

  for (const leadId of [...new Set(input.leadIds)].slice(0, MAX_LIMIT)) {
    const current = await db.collection(LEADS).doc(leadId).get();
    if (!current.exists) { skipped += 1; continue; }
    const plan = await inspectHistoricalLead(leadId, current.data() as Raw);
    if (plan.classification !== "SAFE_AUTO_RECONCILABLE" || !plan.relatedEntities.uid) {
      skipped += 1;
      continue;
    }
    const eventId = reconciliationEventId(leadId);
    const outcome = await db.runTransaction(async (transaction) => {
      const leadRef = db.collection(LEADS).doc(leadId);
      const eventRef = db.collection(EVENTS).doc(eventId);
      const [lead, event] = await Promise.all([transaction.get(leadRef), transaction.get(eventRef)]);
      if (!lead.exists || event.exists || text(lead.get("linkedUid"))) return false;
      transaction.set(leadRef, {
        linkedUid: plan.relatedEntities.uid,
        identityLinkStatus: "LINKED",
        linkMethod: "HISTORICAL_RECONCILIATION",
        linkedAt: FieldValue.serverTimestamp(),
        reconciliationRunId: input.runId,
      }, { merge: true });
      transaction.create(eventRef, {
        id: eventId,
        caseId: null,
        uid: plan.relatedEntities.uid,
        actorType: "system",
        actorId: "historical-reconciliation",
        actorRole: "system",
        eventType: "historical_reconciliation_applied",
        eventLabel: "Rapprochement historique appliqué",
        eventPayload: { entityType: "lead", entityId: leadId, classification: plan.classification, runId: input.runId, changedFields: ["linkedUid", "identityLinkStatus", "linkMethod"] },
        createdAt: new Date().toISOString(),
      });
      return true;
    });
    if (outcome) { applied += 1; auditEventIds.push(eventId); } else { skipped += 1; }
  }
  return { mode: "APPLY_SAFE_ONLY", applied, skipped, auditEventIds };
}
