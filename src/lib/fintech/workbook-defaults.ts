import type {
  FinancialProduct,
  FxRate,
  PricingRule,
  RiskSurchargeRule,
} from "@/types/fintech";

const now = "2026-04-02T00:00:00.000Z";

export const financialProducts: FinancialProduct[] = [
  {
    id: "prefinancement-canada-cad",
    name: "Préfinancement mobilité Canada",
    region: "canada",
    targetCurrency: "CAD",
    durationMonths: 12,
    contributionOptions: [3, 0],
    active: true,
    description:
      "Justificatif financier Canada en CAD, avec équivalent XAF et options d'apport 3 mois ou 0 apport.",
    configuration: {
      workbook:
        "AVI_CERTIFY_Modele_Prefinancement_Canada_CAD_XAF_dynamique.xlsx",
      sensitivityRange: [8000, 10000, 12000, 15000, 18000, 20000],
    },
  },
  {
    id: "prefinancement-eu-eur",
    name: "Préfinancement mobilité UE",
    region: "eu",
    targetCurrency: "EUR",
    durationMonths: 12,
    contributionOptions: [3, 0],
    active: true,
    description:
      "Justificatif financier zone UE en EUR, avec équivalent XAF et options d'apport 3 mois ou 0 apport.",
    configuration: {
      workbook: "AVI_CERTIFY_Modele_Prefinancement_UE_EUR_XAF_dynamique.xlsx",
      sensitivityRange: [7380, 8000, 9000, 10000, 12000, 15000, 20000],
    },
  },
];

export const fxRates: FxRate[] = [
  {
    id: "fx-eur-xaf",
    pair: "EUR/XAF",
    baseCurrency: "EUR",
    quoteCurrency: "XAF",
    rate: 655.957,
    source: "workbook",
    sourceMetadata: "BEAC/BCEAO fixed parity, workbook Hypotheses!C8.",
    validAt: now,
    updatedAt: now,
    manualOverride: false,
  },
  {
    id: "fx-eur-cad",
    pair: "EUR/CAD",
    baseCurrency: "EUR",
    quoteCurrency: "CAD",
    rate: 1.603,
    source: "workbook",
    sourceMetadata: "Workbook Hypotheses!C7.",
    validAt: now,
    updatedAt: now,
    manualOverride: false,
  },
  {
    id: "fx-cad-xaf",
    pair: "CAD/XAF",
    baseCurrency: "CAD",
    quoteCurrency: "XAF",
    rate: 655.957 / 1.603,
    source: "workbook",
    sourceMetadata: "Derived from EUR/XAF divided by EUR/CAD.",
    validAt: now,
    updatedAt: now,
    manualOverride: false,
  },
];

export const pricingRules: PricingRule[] = [
  {
    id: "pricing-canada-cad",
    region: "canada",
    targetCurrency: "CAD",
    baseFinancingFeeRate: 305 / 5536,
    historicalFinancingFee: 305,
    historicalTransferFee: 165,
    historicalFinancedAmount: 5536,
    transferFeeRate: 165 / 5536,
    minimumTransferFee: 165 * 1.603,
    serviceFee: 460 * 1.603,
    discountRateOptionA: 0,
    discountRateOptionB: 0,
    feePolicy:
      "Service fee 460 EUR converted to CAD; transfer floor 165 EUR converted to CAD; financing and transfer rates derive from 305/5536 and 165/5536.",
    updatedAt: now,
  },
  {
    id: "pricing-eu-eur",
    region: "eu",
    targetCurrency: "EUR",
    baseFinancingFeeRate: 305 / 5536,
    historicalFinancingFee: 305,
    historicalTransferFee: 165,
    historicalFinancedAmount: 5536,
    transferFeeRate: 165 / 5536,
    minimumTransferFee: 165,
    serviceFee: 460,
    discountRateOptionA: 0,
    discountRateOptionB: 0,
    feePolicy:
      "Service fee fixed at 460 EUR; transfer floor fixed at 165 EUR; financing and transfer rates derive from 305/5536 and 165/5536.",
    updatedAt: now,
  },
];

export const riskSurchargeRules: RiskSurchargeRule[] = [
  {
    id: "risk-standard-canada",
    region: "canada",
    updatedAt: now,
    tiers: [
      { maxFinancedShare: 0.25, surchargeRate: 0, label: "<=25%" },
      { maxFinancedShare: 0.5, surchargeRate: 0.0025, label: ">25%-50%" },
      { maxFinancedShare: 0.75, surchargeRate: 0.005, label: ">50%-75%" },
      { maxFinancedShare: 1, surchargeRate: 0.015, label: ">75%-100%" },
    ],
  },
  {
    id: "risk-standard-eu",
    region: "eu",
    updatedAt: now,
    tiers: [
      { maxFinancedShare: 0.25, surchargeRate: 0, label: "<=25%" },
      { maxFinancedShare: 0.5, surchargeRate: 0.0025, label: ">25%-50%" },
      { maxFinancedShare: 0.75, surchargeRate: 0.005, label: ">50%-75%" },
      { maxFinancedShare: 1, surchargeRate: 0.015, label: ">75%-100%" },
    ],
  },
];

export function getProductByRegion(region: "canada" | "eu") {
  const product = financialProducts.find((item) => item.region === region);

  if (!product) {
    throw new Error(`No financial product configured for region ${region}.`);
  }

  return product;
}

export function getPricingRuleByRegion(region: "canada" | "eu") {
  const rule = pricingRules.find((item) => item.region === region);

  if (!rule) {
    throw new Error(`No pricing rule configured for region ${region}.`);
  }

  return rule;
}

export function getRiskRuleByRegion(region: "canada" | "eu") {
  const rule = riskSurchargeRules.find((item) => item.region === region);

  if (!rule) {
    throw new Error(`No risk rule configured for region ${region}.`);
  }

  return rule;
}

export function getFxRateToXaf(region: "canada" | "eu") {
  const pair = region === "canada" ? "CAD/XAF" : "EUR/XAF";
  const rate = fxRates.find((item) => item.pair === pair);

  if (!rate) {
    throw new Error(`No FX rate configured for ${pair}.`);
  }

  return rate;
}
