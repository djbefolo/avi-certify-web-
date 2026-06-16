import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getFintechStore } from "@/lib/fintech/fintech-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const simulationId =
      typeof body.simulationId === "string" ? body.simulationId : "";
    if (!simulationId) throw new Error("A saved simulation is required.");

    const [clientCase, simulation] = await Promise.all([
      getAdminOperationsStore().getCase(caseId),
      getFintechStore().getSimulation(simulationId),
    ]);
    if (!clientCase) throw new Error("Client case not found.");
    if (!simulation) throw new Error("Saved simulation not found.");
    if (
      (simulation.input.caseId && simulation.input.caseId !== caseId) ||
      (simulation.input.uid && simulation.input.uid !== clientCase.uid)
    ) {
      throw new Error("Saved simulation does not belong to this client case.");
    }

    const result = await getAdminOperationsStore().createCaseReportDraft(
      caseId,
      {
        simulationId: simulation.id,
        quoteId: typeof body.quoteId === "string" ? body.quoteId : null,
        productCode:
          simulation.region === "canada"
            ? "prefinancement-canada-cad"
            : "prefinancement-ue-eur",
        region: simulation.region,
        xafAmount: simulation.xafEquivalent.targetAmount,
        option: simulation.option,
        riskTier: `${Math.round(simulation.financedShare * 100)}%`,
      },
      actor,
    );

    return result;
  });
}
