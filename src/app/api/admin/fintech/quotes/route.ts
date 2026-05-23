import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { QuoteService } from "@/lib/fintech/quote.service";
import { quoteInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    const input = quoteInputSchema.parse(await readJson(request));
    const simulation = new FinancingSimulationService().simulate({
      ...input.simulationInput,
      createdBy: actor.uid,
    });
    const quote = await new QuoteService().createQuote({
      simulation,
      clientIdentity: input.clientIdentity,
    });

    return { quote };
  }, {
    type: "quote_created",
    targetCollection: "financing_quotes",
  });
}
