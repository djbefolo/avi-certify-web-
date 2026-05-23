import type {
  AmortizationRow,
  ComparisonResult,
  ContributionOption,
  FinancingSimulation,
  FinancingSimulationInput,
  FintechRegion,
  SensitivityRow,
} from "@/types/fintech";
import {
  getFxRateToXaf,
  getPricingRuleByRegion,
  getProductByRegion,
} from "@/lib/fintech/workbook-defaults";
import { RiskPricingService } from "@/lib/fintech/risk-pricing.service";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function inferOption(contributionMonths: number): ContributionOption {
  if (contributionMonths === 3) {
    return "option_a_3m";
  }

  if (contributionMonths === 0) {
    return "option_b_0m";
  }

  return "custom";
}

export class FinancingSimulationService {
  constructor(private readonly riskPricing = new RiskPricingService()) {}

  simulate(input: FinancingSimulationInput): FinancingSimulation {
    const product = getProductByRegion(input.region);
    const pricing = getPricingRuleByRegion(input.region);
    const fx = getFxRateToXaf(input.region);
    const durationMonths = input.durationMonths ?? product.durationMonths;
    const targetAmount =
      input.targetAmount ??
      (input.xafAmount === undefined ? 0 : input.xafAmount / fx.rate);

    const xafAmount = input.xafAmount ?? targetAmount * fx.rate;
    const theoreticalMonthlyAmount =
      durationMonths === 0 ? 0 : targetAmount / durationMonths;
    const studentContribution =
      theoreticalMonthlyAmount * input.contributionMonths;
    const financedAmount = Math.max(0, targetAmount - studentContribution);
    const financedShare = targetAmount === 0 ? 0 : financedAmount / targetAmount;
    const riskSurchargeRate = this.riskPricing.getRiskSurchargeRate(
      financedShare,
      input.region,
    );
    const totalFinancingFeeRate =
      pricing.baseFinancingFeeRate + riskSurchargeRate;
    const financingFee = financedAmount * totalFinancingFeeRate;
    const transferFee = Math.max(
      pricing.minimumTransferFee,
      financedAmount * pricing.transferFeeRate,
    );
    const serviceFee = pricing.serviceFee;
    const grossFees = financingFee + transferFee + serviceFee;
    const option = inferOption(input.contributionMonths);
    const defaultDiscount =
      option === "option_a_3m"
        ? pricing.discountRateOptionA
        : option === "option_b_0m"
          ? pricing.discountRateOptionB
          : 0;
    const discountRate = input.discountRate ?? defaultDiscount;
    const discountAmount = grossFees * discountRate;
    const netFees = grossFees - discountAmount;
    const cashDueAtSignature = studentContribution + netFees;
    const monthlyRepayment =
      durationMonths === 0 ? 0 : financedAmount / durationMonths;
    const totalClientEffort = studentContribution + netFees + financedAmount;
    const feeYieldOnFinancedAmount =
      financedAmount === 0 ? 0 : netFees / financedAmount;
    const feeLoadOnTargetAmount = targetAmount === 0 ? 0 : netFees / targetAmount;
    const createdAt = new Date().toISOString();

    return {
      id: createId("sim"),
      createdAt,
      input: { ...input, xafAmount },
      region: input.region,
      targetCurrency: product.targetCurrency,
      option,
      fx: {
        rateToXaf: fx.rate,
        reference: input.fxReference ?? fx.sourceMetadata,
      },
      targetAmount,
      theoreticalMonthlyAmount,
      studentContribution,
      financedAmount,
      financedShare,
      riskSurchargeRate,
      totalFinancingFeeRate,
      financingFee,
      transferFee,
      serviceFee,
      grossFees,
      discountRate,
      discountAmount,
      netFees,
      cashDueAtSignature,
      monthlyRepayment,
      totalClientEffort,
      feeYieldOnFinancedAmount,
      feeLoadOnTargetAmount,
      xafEquivalent: {
        targetAmount: targetAmount * fx.rate,
        studentContribution: studentContribution * fx.rate,
        cashDueAtSignature: cashDueAtSignature * fx.rate,
        monthlyRepayment: monthlyRepayment * fx.rate,
        totalClientEffort: totalClientEffort * fx.rate,
      },
      amortizationSchedule: this.buildAmortizationSchedule(
        durationMonths,
        theoreticalMonthlyAmount,
        monthlyRepayment,
        financedAmount,
      ),
    };
  }

  compare(region: FintechRegion, xafAmount: number): ComparisonResult {
    const optionA = this.simulate({
      region,
      xafAmount,
      contributionMonths: 3,
    });
    const optionB = this.simulate({
      region,
      xafAmount,
      contributionMonths: 0,
    });

    return {
      region,
      targetCurrency: optionA.targetCurrency,
      xafAmount,
      optionA,
      optionB,
      deltaOptionBMinusA: {
        netFees: optionB.netFees - optionA.netFees,
        cashDueAtSignature:
          optionB.cashDueAtSignature - optionA.cashDueAtSignature,
        monthlyRepayment: optionB.monthlyRepayment - optionA.monthlyRepayment,
        totalClientEffort: optionB.totalClientEffort - optionA.totalClientEffort,
        financedAmount: optionB.financedAmount - optionA.financedAmount,
      },
      auditNote:
        "Delta is recalculated from scenario outputs: net fees C21, cash due C22, monthly repayment C23. This intentionally corrects the Canada workbook Comparatif_Offres C24:C26 references.",
    };
  }

  sensitivity(region: FintechRegion): {
    optionA: SensitivityRow[];
    optionB: SensitivityRow[];
  } {
    const product = getProductByRegion(region);
    const targetAmounts = product.configuration.sensitivityRange as number[];

    return {
      optionA: targetAmounts.map((targetAmount) =>
        this.toSensitivityRow(this.simulate({ region, targetAmount, contributionMonths: 3 })),
      ),
      optionB: targetAmounts.map((targetAmount) =>
        this.toSensitivityRow(this.simulate({ region, targetAmount, contributionMonths: 0 })),
      ),
    };
  }

  private buildAmortizationSchedule(
    durationMonths: number,
    theoreticalMonthlyAmount: number,
    monthlyRepayment: number,
    financedAmount: number,
  ): AmortizationRow[] {
    const rows: AmortizationRow[] = [];
    let openingPrincipal = financedAmount;
    let cumulativeRepaid = 0;

    for (let month = 1; month <= durationMonths; month += 1) {
      const repayment = monthlyRepayment;
      const closingPrincipal = Math.max(0, openingPrincipal - repayment);
      cumulativeRepaid += repayment;
      rows.push({
        month,
        theoreticalDisbursement: theoreticalMonthlyAmount,
        financedShareIncluded: monthlyRepayment,
        repayment,
        openingPrincipal,
        closingPrincipal,
        cumulativeRepaid,
      });
      openingPrincipal = closingPrincipal;
    }

    return rows;
  }

  private toSensitivityRow(simulation: FinancingSimulation): SensitivityRow {
    return {
      targetAmount: simulation.targetAmount,
      contributionMonths: simulation.input.contributionMonths,
      studentContribution: simulation.studentContribution,
      financedAmount: simulation.financedAmount,
      totalFinancingFeeRate: simulation.totalFinancingFeeRate,
      financingFee: simulation.financingFee,
      transferFee: simulation.transferFee,
      netFees: simulation.netFees,
      cashDueAtSignature: simulation.cashDueAtSignature,
      monthlyRepayment: simulation.monthlyRepayment,
      cashDueAtSignatureXaf:
        simulation.cashDueAtSignature * simulation.fx.rateToXaf,
    };
  }
}
