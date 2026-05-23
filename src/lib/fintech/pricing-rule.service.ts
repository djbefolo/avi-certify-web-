import type { FintechRegion, PricingRule } from "@/types/fintech";
import { getPricingRuleByRegion, pricingRules } from "@/lib/fintech/workbook-defaults";

export class PricingRuleService {
  getRule(region: FintechRegion): PricingRule {
    return getPricingRuleByRegion(region);
  }

  listRules(): PricingRule[] {
    return pricingRules;
  }

  updateRule(region: FintechRegion, patch: Partial<PricingRule>): PricingRule {
    const rule = getPricingRuleByRegion(region);

    Object.assign(rule, {
      ...patch,
      id: rule.id,
      region: rule.region,
      targetCurrency: rule.targetCurrency,
      updatedAt: new Date().toISOString(),
    });

    return rule;
  }
}
