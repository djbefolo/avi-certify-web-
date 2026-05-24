export type FintechRegion = "canada" | "eu";

export type TargetCurrency = "CAD" | "EUR";

export type ContributionOption = "option_a_3m" | "option_b_0m" | "custom";

export type AuditEventType =
  | "simulation_created"
  | "quote_created"
  | "fx_changed"
  | "pricing_changed"
  | "risk_changed"
  | "product_updated"
  | "report_generated"
  | "admin_access";

export type FinancialProduct = {
  id: string;
  name: string;
  region: FintechRegion;
  targetCurrency: TargetCurrency;
  durationMonths: number;
  contributionOptions: number[];
  active: boolean;
  description: string;
  configuration: Record<string, unknown>;
};

export type FxRate = {
  id: string;
  pair: "EUR/XAF" | "EUR/CAD" | "CAD/XAF";
  baseCurrency: "EUR" | "CAD";
  quoteCurrency: "XAF" | "CAD";
  rate: number;
  source: "workbook" | "manual_admin_override" | "future_provider";
  sourceMetadata: string;
  validAt: string;
  updatedAt: string;
  manualOverride: boolean;
};

export type PricingRule = {
  id: string;
  region: FintechRegion;
  targetCurrency: TargetCurrency;
  baseFinancingFeeRate: number;
  historicalFinancingFee: number;
  historicalTransferFee: number;
  historicalFinancedAmount: number;
  transferFeeRate: number;
  minimumTransferFee: number;
  serviceFee: number;
  discountRateOptionA: number;
  discountRateOptionB: number;
  feePolicy: string;
  updatedAt: string;
};

export type RiskSurchargeRule = {
  id: string;
  region: FintechRegion;
  tiers: Array<{
    maxFinancedShare: number;
    surchargeRate: number;
    label: string;
  }>;
  updatedAt: string;
};

export type FinancingSimulationInput = {
  xafAmount?: number;
  targetAmount?: number;
  region: FintechRegion;
  durationMonths?: number;
  contributionMonths: number;
  discountRate?: number;
  fxReference?: string;
  clientName?: string;
  createdBy?: string;
};

export type AmortizationRow = {
  month: number;
  theoreticalDisbursement: number;
  financedShareIncluded: number;
  repayment: number;
  openingPrincipal: number;
  closingPrincipal: number;
  cumulativeRepaid: number;
};

export type FinancingSimulation = {
  id: string;
  createdAt: string;
  input: FinancingSimulationInput;
  region: FintechRegion;
  targetCurrency: TargetCurrency;
  option: ContributionOption;
  fx: {
    rateToXaf: number;
    reference: string;
  };
  targetAmount: number;
  theoreticalMonthlyAmount: number;
  studentContribution: number;
  financedAmount: number;
  financedShare: number;
  riskSurchargeRate: number;
  totalFinancingFeeRate: number;
  financingFee: number;
  transferFee: number;
  serviceFee: number;
  grossFees: number;
  discountRate: number;
  discountAmount: number;
  netFees: number;
  cashDueAtSignature: number;
  monthlyRepayment: number;
  totalClientEffort: number;
  feeYieldOnFinancedAmount: number;
  feeLoadOnTargetAmount: number;
  xafEquivalent: {
    targetAmount: number;
    studentContribution: number;
    cashDueAtSignature: number;
    monthlyRepayment: number;
    totalClientEffort: number;
  };
  amortizationSchedule: AmortizationRow[];
};

export type ComparisonResult = {
  region: FintechRegion;
  targetCurrency: TargetCurrency;
  xafAmount: number;
  optionA: FinancingSimulation;
  optionB: FinancingSimulation;
  deltaOptionBMinusA: {
    netFees: number;
    cashDueAtSignature: number;
    monthlyRepayment: number;
    totalClientEffort: number;
    financedAmount: number;
  };
  auditNote: string;
};

export type SensitivityRow = {
  targetAmount: number;
  contributionMonths: number;
  studentContribution: number;
  financedAmount: number;
  totalFinancingFeeRate: number;
  financingFee: number;
  transferFee: number;
  netFees: number;
  cashDueAtSignature: number;
  monthlyRepayment: number;
  cashDueAtSignatureXaf: number;
};

export type FinancingQuote = {
  id: string;
  createdAt: string;
  simulationId: string;
  clientIdentity: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  lineItems: Array<{
    label: string;
    amount: number;
    currency: TargetCurrency;
  }>;
  assumptions: Record<string, unknown>;
  simulationSnapshot: FinancingSimulation;
  status: "draft" | "pending_admin_validation" | "validated";
};

export type FinancialAuditEvent = {
  id: string;
  type: AuditEventType;
  action: AuditEventType | "admin_access_granted" | "admin_access_denied";
  createdAt: string;
  environment: string;
  actor: string;
  actorId?: string;
  actorLabel?: string;
  actorRole?: "admin" | "super_admin" | "unknown";
  targetCollection: string;
  targetId?: string;
  resourceType: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
};
