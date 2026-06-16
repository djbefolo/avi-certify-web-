import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { simulationInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    const parsedInput = simulationInputSchema.parse(await readJson(request));
    const clientCase = parsedInput.caseId
      ? await getAdminOperationsStore().getCase(parsedInput.caseId)
      : null;

    if (parsedInput.caseId && !clientCase) {
      throw new Error("Client case not found.");
    }
    if (
      clientCase &&
      parsedInput.uid &&
      parsedInput.uid !== clientCase.uid
    ) {
      throw new Error("Simulation client does not match the selected case.");
    }

    const input = {
      ...parsedInput,
      uid: clientCase?.uid ?? parsedInput.uid,
      caseId: clientCase?.id ?? parsedInput.caseId,
    };
    const simulation = new FinancingSimulationService().simulate({
      ...input,
      createdBy: actor.uid,
    });
    const saved = await getFintechStore().createSimulation(simulation);

    if (input.caseId) {
      await getAdminOperationsStore().linkFinancialSimulation(
        input.caseId,
        {
          simulationId: saved.id,
          productCode:
            saved.region === "canada"
              ? "prefinancement-canada-cad"
              : "prefinancement-ue-eur",
          region: saved.region,
          xafAmount: saved.xafEquivalent.targetAmount,
          option: saved.option,
          riskTier: `${Math.round(saved.financedShare * 100)}%`,
          status: "SIMULATED",
        },
        actor,
      );
    }

    return { simulation: saved };
  }, {
    type: "simulation_created",
    targetCollection: "financing_simulations",
  });
}

export async function GET(request: NextRequest) {
  return withAdmin(request, async () => ({
    simulations: await getFintechStore().listSimulations(),
  }));
}
