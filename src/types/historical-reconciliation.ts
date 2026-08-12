export const historicalReconciliationClassifications = [
  "ALREADY_CORRECT",
  "SAFE_AUTO_RECONCILABLE",
  "MANUAL_REVIEW",
  "AMBIGUOUS",
  "CONFLICT",
  "INSUFFICIENT_DATA",
  "UNSUPPORTED_LEGACY",
] as const;

export type HistoricalReconciliationClassification =
  (typeof historicalReconciliationClassifications)[number];

export type HistoricalReconciliationMode = "DRY_RUN" | "APPLY_SAFE_ONLY";

export type HistoricalReconciliationEvidence = {
  code: string;
  strength: "STRONG" | "MEDIUM" | "WEAK";
  detail: string;
};

export type HistoricalReconciliationChange = {
  field: string;
  from: string | null;
  to: string | null;
};

export type HistoricalReconciliationItem = {
  entityType: "lead";
  entityId: string;
  classification: HistoricalReconciliationClassification;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: HistoricalReconciliationEvidence[];
  proposedChanges: HistoricalReconciliationChange[];
  blockingReasons: string[];
  relatedEntities: {
    uid: string | null;
    clientId: string | null;
    caseIds: string[];
    paymentIds: string[];
  };
  requiresManualReview: boolean;
};

export type HistoricalReconciliationCounts = Record<
  HistoricalReconciliationClassification,
  number
>;

export type HistoricalReconciliationPlan = {
  mode: "DRY_RUN";
  scope: "leads";
  inspected: number;
  nextCursor: string | null;
  counts: HistoricalReconciliationCounts;
  items: HistoricalReconciliationItem[];
};

export type HistoricalReconciliationApplyResult = {
  mode: "APPLY_SAFE_ONLY";
  applied: number;
  skipped: number;
  auditEventIds: string[];
};
