import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { fintechRegionSchema } from "@/lib/fintech/validation";
import { withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => {
    const region = fintechRegionSchema.parse(
      request.nextUrl.searchParams.get("region") ?? "canada",
    );

    return {
      region,
      sensitivity: new FinancingSimulationService().sensitivity(region),
    };
  });
}
