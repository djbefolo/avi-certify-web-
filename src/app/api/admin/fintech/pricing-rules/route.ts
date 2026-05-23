import { NextRequest } from "next/server";
import { PricingRuleService } from "@/lib/fintech/pricing-rule.service";
import { pricingRulePatchSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    pricingRules: new PricingRuleService().listRules(),
  }));
}

export async function PATCH(request: NextRequest) {
  return withAdmin(request, async () => {
    const patch = pricingRulePatchSchema.parse(await readJson(request));
    const updated = new PricingRuleService().updateRule(patch.region, patch);

    return { pricingRule: updated };
  }, {
    type: "pricing_changed",
    targetCollection: "pricing_rules",
  });
}
