import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { QuoteService } from "@/lib/fintech/quote.service";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { quoteInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    quotes: await getFintechStore().listQuotes(),
  }));
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    const input = quoteInputSchema.parse(await readJson(request));
    let simulation = input.simulationId
      ? await getFintechStore().getSimulation(input.simulationId)
      : null;

    if (!simulation) {
      if (!input.simulationInput) {
        throw new Error("A saved simulation or simulation input is required before creating a quote.");
      }

      simulation = new FinancingSimulationService().simulate({
        ...input.simulationInput,
        createdBy: actor.uid,
      });
      simulation = await getFintechStore().createSimulation(simulation);
    }

    const caseId = simulation.input.caseId;
    const clientCase = caseId
      ? await getAdminOperationsStore().getCase(caseId)
      : null;
    if (caseId && !clientCase) {
      throw new Error("Client case not found for saved simulation.");
    }
    if (
      clientCase &&
      simulation.input.uid &&
      simulation.input.uid !== clientCase.uid
    ) {
      throw new Error("Saved simulation does not belong to the selected case.");
    }

    const quote = await new QuoteService().createQuote({
      simulation,
      clientIdentity: clientCase
        ? {
            fullName: clientCase.clientName ?? undefined,
            email: clientCase.clientEmail ?? undefined,
            phone: input.clientIdentity?.phone,
          }
        : input.clientIdentity,
    });

    if (clientCase) {
      await getAdminOperationsStore().linkFinancialSimulation(
        clientCase.id,
        {
          simulationId: simulation.id,
          quoteId: quote.id,
          productCode:
            simulation.region === "canada"
              ? "prefinancement-canada-cad"
              : "prefinancement-ue-eur",
          region: simulation.region,
          xafAmount: simulation.xafEquivalent.targetAmount,
          option: simulation.option,
          riskTier: `${Math.round(simulation.financedShare * 100)}%`,
          status: "QUOTED",
        },
        actor,
      );
    }

    return { quote };
  }, {
    type: "quote_created",
    targetCollection: "financing_quotes",
  });
}
