import { NextRequest } from "next/server";
import { riskSurchargeRules } from "@/lib/fintech/workbook-defaults";
import { riskRulePatchSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    riskRules: riskSurchargeRules,
  }));
}

export async function PATCH(request: NextRequest) {
  return withAdmin(request, async () => {
    const patch = riskRulePatchSchema.parse(await readJson(request));
    const rule = riskSurchargeRules.find((item) => item.region === patch.region);

    if (!rule) {
      throw new Error(`Risk rule not found for ${patch.region}.`);
    }

    if (patch.tiers) {
      rule.tiers = patch.tiers;
    }

    rule.updatedAt = new Date().toISOString();

    return { riskRule: rule };
  }, {
    type: "risk_changed",
    targetCollection: "risk_surcharge_rules",
  });
}
