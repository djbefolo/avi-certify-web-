import type {
  HousingAutoDecisionSnapshot,
  HousingAutoIssuanceReason,
  HousingInventoryItem,
} from "@/types/housing";
import { resolveHousingClientPricing } from "@/lib/housing/housing-pricing";

export const HOUSING_AUTO_ISSUANCE_POLICY_VERSION = "housing-auto-issuance-v1";

export type HousingAutoIssuancePolicyInput = {
  inventory: HousingInventoryItem | null;
  expectedArrivalDate: string | null;
  requestComplete: boolean;
  paymentConfirmed: boolean;
  duplicateOrFraudRisk: boolean;
  globalKillSwitchEnabled: boolean;
  evaluatedAt: string;
};

function isDateInsideWindow(
  value: string | null,
  from?: string,
  until?: string,
) {
  if (!value) return false;
  const target = Date.parse(value);
  if (Number.isNaN(target)) return false;
  if (from && target < Date.parse(from)) return false;
  if (until && target > Date.parse(until)) return false;
  return true;
}

export function evaluateHousingAutoIssuance(
  input: HousingAutoIssuancePolicyInput,
): HousingAutoDecisionSnapshot {
  const reasons: HousingAutoIssuanceReason[] = [];
  const inventory = input.inventory;
  const autoIssuance = inventory?.autoIssuance;
  const evaluatedAtMs = Date.parse(input.evaluatedAt);
  const validUntilMs = autoIssuance?.validUntil
    ? Date.parse(autoIssuance.validUntil)
    : Number.NaN;
  const residenceEligible = Boolean(
    inventory &&
      inventory.isEligibleForCertificate &&
      ["available", "conditionally_available"].includes(inventory.inventoryStatus) &&
      autoIssuance?.enabled &&
      autoIssuance.eligibilityStatus === "eligible",
  );
  let resolvedClientMonthlyRent: number | null = null;
  try {
    resolvedClientMonthlyRent = inventory
      ? resolveHousingClientPricing(inventory.pricing)?.clientMonthlyRent ?? null
      : null;
  } catch {
    resolvedClientMonthlyRent = null;
  }
  const priceVerified = Boolean(
    inventory?.pricing.priceValidationStatus === "verified" &&
      resolvedClientMonthlyRent &&
      resolvedClientMonthlyRent > 0,
  );
  const validityCurrent = Boolean(
    autoIssuance?.validUntil &&
      Number.isFinite(evaluatedAtMs) &&
      Number.isFinite(validUntilMs) &&
      validUntilMs > evaluatedAtMs,
  );
  const capacityAvailable =
    autoIssuance?.conditionalCapacity === undefined ||
    (typeof autoIssuance.remainingConditionalCapacity === "number" &&
      autoIssuance.remainingConditionalCapacity > 0);
  const arrivalDateAllowed = Boolean(
    autoIssuance &&
      isDateInsideWindow(
        input.expectedArrivalDate,
        autoIssuance.arrivalDateFrom,
        autoIssuance.arrivalDateUntil,
      ),
  );

  if (!input.globalKillSwitchEnabled) reasons.push("GLOBAL_KILL_SWITCH_DISABLED");
  if (!residenceEligible) reasons.push("RESIDENCE_NOT_ELIGIBLE");
  if (!validityCurrent) reasons.push("VALIDATION_EXPIRED");
  if (!priceVerified) reasons.push("PRICE_NOT_VERIFIED");
  if (!capacityAvailable) reasons.push("CAPACITY_EXHAUSTED");
  if (!arrivalDateAllowed) reasons.push("ARRIVAL_DATE_OUT_OF_RANGE");
  if (!input.requestComplete) reasons.push("REQUEST_INCOMPLETE");
  if (!input.paymentConfirmed) reasons.push("PAYMENT_NOT_CONFIRMED");
  if (input.duplicateOrFraudRisk) reasons.push("DUPLICATE_OR_FRAUD_RISK");
  if (autoIssuance?.manualReviewRequired) reasons.push("MANUAL_REVIEW_FORCED");

  const eligible = reasons.length === 0;

  return {
    evaluatedAt: input.evaluatedAt,
    policyVersion: HOUSING_AUTO_ISSUANCE_POLICY_VERSION,
    eligible,
    reasons: eligible ? ["ELIGIBLE"] : reasons,
    housingInventoryVersion: inventory?.version,
    paymentVerified: input.paymentConfirmed,
    requestComplete: input.requestComplete,
    residenceEligible,
    priceVerified,
    validityCurrent,
    capacityAvailable,
    fraudOrDuplicateFlag: input.duplicateOrFraudRisk,
  };
}
