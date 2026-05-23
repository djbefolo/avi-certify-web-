import { NextRequest } from "next/server";
import { FxService } from "@/lib/fintech/fx.service";
import { fxPatchSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    fxRates: new FxService().listRates(),
  }));
}

export async function PATCH(request: NextRequest) {
  return withAdmin(request, async () => {
    const patch = fxPatchSchema.parse(await readJson(request));
    const fxRate = new FxService().updateManualRate(patch.pair, patch.rate);

    return { fxRate };
  }, {
    type: "fx_changed",
    targetCollection: "fx_rates",
  });
}
