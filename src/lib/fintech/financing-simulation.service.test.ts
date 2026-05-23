import { describe, expect, it } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";

const service = new FinancingSimulationService();

function expectClose(actual: number, expected: number, precision = 6) {
  expect(actual).toBeCloseTo(expected, precision);
}

describe("FinancingSimulationService workbook regressions", () => {
  it("matches Canada 8M XAF option A workbook outputs", () => {
    const simulation = service.simulate({
      region: "canada",
      xafAmount: 8_000_000,
      contributionMonths: 3,
    });

    expectClose(simulation.targetAmount, 19550.06197052551);
    expectClose(simulation.studentContribution, 4887.515492631377);
    expectClose(simulation.financedAmount, 14662.546477894131);
    expectClose(simulation.riskSurchargeRate, 0.005);
    expectClose(simulation.financingFee, 881.1300509873229);
    expectClose(simulation.transferFee, 437.01592645457583);
    expectClose(simulation.serviceFee, 737.38);
    expectClose(simulation.netFees, 2055.5259774418987);
    expectClose(simulation.cashDueAtSignature, 6943.041470073276);
    expectClose(simulation.monthlyRepayment, 1221.8788731578443);
    expectClose(simulation.feeLoadOnTargetAmount, 0.10514166044797688);
  });

  it("matches Canada 8M XAF option B workbook outputs", () => {
    const simulation = service.simulate({
      region: "canada",
      xafAmount: 8_000_000,
      contributionMonths: 0,
    });

    expectClose(simulation.targetAmount, 19550.06197052551);
    expectClose(simulation.studentContribution, 0);
    expectClose(simulation.financedAmount, 19550.06197052551);
    expectClose(simulation.riskSurchargeRate, 0.015);
    expectClose(simulation.netFees, 2690.408589627787);
    expectClose(simulation.cashDueAtSignature, 2690.408589627787);
    expectClose(simulation.monthlyRepayment, 1629.1718308771258);
  });

  it("matches EU 8M XAF option A workbook outputs", () => {
    const simulation = service.simulate({
      region: "eu",
      xafAmount: 8_000_000,
      contributionMonths: 3,
    });

    expectClose(simulation.targetAmount, 12195.92137899283);
    expectClose(simulation.studentContribution, 3048.9803447482077);
    expectClose(simulation.financedAmount, 9146.941034244623);
    expectClose(simulation.netFees, 1282.299424480286);
    expectClose(simulation.cashDueAtSignature, 4331.279769228494);
    expectClose(simulation.monthlyRepayment, 762.2450861870519);
  });

  it("matches EU 8M XAF option B workbook outputs", () => {
    const simulation = service.simulate({
      region: "eu",
      xafAmount: 8_000_000,
      contributionMonths: 0,
    });

    expectClose(simulation.targetAmount, 12195.92137899283);
    expectClose(simulation.netFees, 1678.3584464303099);
    expectClose(simulation.cashDueAtSignature, 1678.3584464303099);
    expectClose(simulation.monthlyRepayment, 1016.3267815827359);
  });

  it("corrects Canada comparison deltas using scenario outputs", () => {
    const comparison = service.compare("canada", 8_000_000);

    expectClose(comparison.deltaOptionBMinusA.netFees, 634.8826121858883);
    expectClose(
      comparison.deltaOptionBMinusA.cashDueAtSignature,
      -4252.632880445488,
    );
    expectClose(comparison.deltaOptionBMinusA.monthlyRepayment, 407.2929577192815);
    expect(comparison.auditNote).toContain("corrects the Canada workbook");
  });

  it("generates dynamic sensitivity rows for Canada and EU", () => {
    const canada = service.sensitivity("canada");
    const eu = service.sensitivity("eu");

    expect(canada.optionA[0].targetAmount).toBe(8000);
    expectClose(canada.optionA[0].cashDueAtSignature, 3362.438583815029);
    expect(eu.optionA[0].targetAmount).toBe(7380);
    expectClose(eu.optionA[0].cashDueAtSignature, 2802.6199060693643);
    expect(eu.optionB[0].targetAmount).toBe(7380);
    expectClose(eu.optionB[0].cashDueAtSignature, 1197.2534682080927);
  });
});
