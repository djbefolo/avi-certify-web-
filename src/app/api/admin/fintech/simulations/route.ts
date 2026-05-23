import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { simulationInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    const input = simulationInputSchema.parse(await readJson(request));
    const simulation = new FinancingSimulationService().simulate({
      ...input,
      createdBy: actor.uid,
    });
    const saved = await getFintechStore().createSimulation(simulation);

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
