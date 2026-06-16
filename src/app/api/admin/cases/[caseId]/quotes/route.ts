import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { QuoteService } from "@/lib/fintech/quote.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const simulationId =
      typeof body.simulationId === "string" ? body.simulationId : "";

    if (!simulationId) {
      throw new Error("A saved simulation is required before creating a quote.");
    }

    const simulation = await getFintechStore().getSimulation(simulationId);

    if (!simulation) {
      throw new Error("Saved simulation not found.");
    }

    const clientCase = await getAdminOperationsStore().getCase(caseId);

    if (!clientCase) {
      throw new Error("Client case not found.");
    }
    if (
      (simulation.input.caseId && simulation.input.caseId !== caseId) ||
      (simulation.input.uid && simulation.input.uid !== clientCase.uid)
    ) {
      throw new Error("Saved simulation does not belong to this client case.");
    }

    const quote = await new QuoteService().createQuote({
      simulation: {
        ...simulation,
        input: {
          ...simulation.input,
          uid: clientCase.uid,
          caseId,
        },
      },
      clientIdentity: {
        fullName: clientCase.clientName ?? undefined,
        email: clientCase.clientEmail ?? undefined,
      },
    });
    const financialFile = await getAdminOperationsStore().linkFinancialSimulation(
      caseId,
      {
        simulationId: simulation.id,
        quoteId: quote.id,
        productCode: simulation.region === "canada" ? "prefinancement-canada-cad" : "prefinancement-ue-eur",
        region: simulation.region,
        xafAmount: simulation.xafEquivalent.targetAmount,
        option: simulation.option,
        riskTier: `${Math.round(simulation.financedShare * 100)}%`,
        status: "QUOTED",
      },
      actor,
    );

    return { quote, financialFile };
  });
}
