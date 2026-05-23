import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { simulationInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAdmin(request, async (actor) => {
    const body = (await readJson(request)) as Record<string, unknown>;
    const simulationInput = simulationInputSchema.parse(
      body.simulationInput ?? body,
    );
    const simulation = new FinancingSimulationService().simulate({
      ...simulationInput,
      createdBy: actor.uid,
    });
    const report = {
      id: `report_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      clientIdentity: body.clientIdentity ?? {},
      targetCountryOrZone: simulation.region === "canada" ? "Canada" : "UE",
      targetAmount: simulation.targetAmount,
      targetCurrency: simulation.targetCurrency,
      fxAssumptions: simulation.fx,
      selectedOption: simulation.option,
      feesBreakdown: {
        financingFee: simulation.financingFee,
        transferFee: simulation.transferFee,
        serviceFee: simulation.serviceFee,
        grossFees: simulation.grossFees,
        netFees: simulation.netFees,
      },
      repaymentSchedule: simulation.amortizationSchedule,
      totalClientEffort: simulation.totalClientEffort,
      complianceNotes: [
        "Simulation indicative.",
        "Validation administrative requise avant émission d’un devis final.",
        "Aucun mouvement d’argent, transfert ou crédit n’est exécuté par ce rapport.",
      ],
      adminValidationStatus: "pending_admin_validation",
      pdfReady: true,
    };

    return { report };
  }, {
    type: "report_generated",
    targetCollection: "client_prefinancing_reports",
  });
}
