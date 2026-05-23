import type { FintechRegion, RiskSurchargeRule } from "@/types/fintech";
import { getRiskRuleByRegion } from "@/lib/fintech/workbook-defaults";

export class RiskPricingService {
  getRiskSurchargeRate(
    financedShare: number,
    region: FintechRegion,
    rule: RiskSurchargeRule = getRiskRuleByRegion(region),
  ): number {
    const normalizedShare = Math.max(0, financedShare);
    const tier = rule.tiers
      .slice()
      .sort((a, b) => a.maxFinancedShare - b.maxFinancedShare)
      .find((item) => normalizedShare <= item.maxFinancedShare);

    return tier?.surchargeRate ?? rule.tiers[rule.tiers.length - 1]?.surchargeRate ?? 0;
  }
}
