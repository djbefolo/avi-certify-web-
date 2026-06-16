import { NextRequest } from "next/server";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { simulationInputSchema } from "@/lib/fintech/validation";
import { readJson, withAdmin } from "@/app/api/admin/fintech/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getFintechStore } from "@/lib/fintech/fintech-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClientIdentity = {
  fullName?: string;
  email?: string;
  phone?: string;
};

function readClientIdentity(value: unknown): ClientIdentity {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return {
    fullName: typeof record.fullName === "string" ? record.fullName : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
    phone: typeof record.phone === "string" ? record.phone : undefined,
  };
}

export async function POST(request: NextRequest) {
  return withAdmin(
    request,
    async (actor) => {
      const body = (await readJson(request)) as Record<string, unknown>;
      const simulationInput = simulationInputSchema.parse(
        body.simulationInput ?? body,
      );
      const generatedSimulation = new FinancingSimulationService().simulate({
        ...simulationInput,
        createdBy: actor.uid,
      });
      const clientCase = generatedSimulation.input.caseId
        ? await getAdminOperationsStore().getCase(generatedSimulation.input.caseId)
        : null;
      if (generatedSimulation.input.caseId && !clientCase) {
        throw new Error("Client case not found.");
      }
      if (
        clientCase &&
        generatedSimulation.input.uid &&
        generatedSimulation.input.uid !== clientCase.uid
      ) {
        throw new Error("Report client does not match the selected case.");
      }
      const simulation = await getFintechStore().createSimulation({
        ...generatedSimulation,
        input: {
          ...generatedSimulation.input,
          uid: clientCase?.uid ?? generatedSimulation.input.uid,
          caseId: clientCase?.id ?? generatedSimulation.input.caseId,
        },
      });

      const requestedIdentity = readClientIdentity(body.clientIdentity);
      const clientIdentity = clientCase
        ? {
            fullName: clientCase.clientName ?? undefined,
            email: clientCase.clientEmail ?? undefined,
            phone: requestedIdentity.phone,
          }
        : requestedIdentity;
      const report = {
        id: `report_${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        clientIdentity,
        uid: simulation.input.uid ?? null,
        caseId: simulation.input.caseId ?? null,
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
          "Validation administrative requise avant emission d'un devis final.",
          "Aucun mouvement d'argent, transfert ou credit n'est execute par ce rapport.",
        ],
        adminValidationStatus: "pending_admin_validation",
        pdfReady: true,
        deliveryStatus: "INTERNAL_ONLY",
        emailStatus: "NOT_SENT",
        deliveryNote: "Rapport interne non envoye au client.",
      };

      if (clientCase) {
        await getAdminOperationsStore().linkFinancialSimulation(
          clientCase.id,
          {
            simulationId: simulation.id,
            reportId: report.id,
            productCode:
              simulation.region === "canada"
                ? "prefinancement-canada-cad"
                : "prefinancement-ue-eur",
            region: simulation.region,
            xafAmount: simulation.xafEquivalent.targetAmount,
            option: simulation.option,
            riskTier: `${Math.round(simulation.financedShare * 100)}%`,
            status: "REPORTED",
            reportStatus: "GENERATED",
          },
          actor,
        );
      }

      await getAdminOperationsStore().createCommunicationLog({
        caseId: report.caseId,
        uid: report.uid,
        type: "SYSTEM",
        template: "prefinancing-report-internal",
        recipient: clientIdentity.email ?? null,
        status: "NOT_SENT",
        provider: "system",
        messageId: null,
        subject: "Rapport prefinancement interne",
        body: `Report ${report.id} generated for internal review only.`,
      });
      await getAdminOperationsStore().createEvent({
        caseId: report.caseId,
        uid: report.uid,
        actorType: "admin",
        actorId: actor.uid,
        actorRole: actor.role,
        eventType: "report_generated",
        eventLabel: "Rapport interne genere - non envoye au client",
        eventPayload: {
          reportId: report.id,
          deliveryStatus: report.deliveryStatus,
          emailStatus: report.emailStatus,
          recipient: clientIdentity.email ?? null,
        },
      });

      return { report };
    },
    {
      type: "report_generated",
      targetCollection: "client_prefinancing_reports",
    },
  );
}
