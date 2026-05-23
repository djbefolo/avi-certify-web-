import { NextRequest } from "next/server";
import { z } from "zod";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { fintechRegionSchema } from "@/lib/fintech/validation";
import { withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  region: fintechRegionSchema,
  xafAmount: z.coerce.number().positive(),
});

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const query = querySchema.parse({
      region: request.nextUrl.searchParams.get("region") ?? "canada",
      xafAmount: request.nextUrl.searchParams.get("xafAmount") ?? "8000000",
    });

    return {
      comparison: new FinancingSimulationService().compare(
        query.region,
        query.xafAmount,
      ),
    };
  });
}
