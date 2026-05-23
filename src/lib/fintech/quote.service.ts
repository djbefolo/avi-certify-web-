import type { FinancingQuote, FinancingSimulation } from "@/types/fintech";
import { getFintechStore } from "@/lib/fintech/fintech-store";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class QuoteService {
  async createQuote(input: {
    simulation: FinancingSimulation;
    clientIdentity?: FinancingQuote["clientIdentity"];
  }): Promise<FinancingQuote> {
    const quote: FinancingQuote = {
      id: createId("quote"),
      createdAt: new Date().toISOString(),
      simulationId: input.simulation.id,
      clientIdentity: input.clientIdentity ?? {},
      lineItems: [
        {
          label: "Apport étudiant",
          amount: input.simulation.studentContribution,
          currency: input.simulation.targetCurrency,
        },
        {
          label: "Frais de préfinancement",
          amount: input.simulation.financingFee,
          currency: input.simulation.targetCurrency,
        },
        {
          label: "Frais de transfert",
          amount: input.simulation.transferFee,
          currency: input.simulation.targetCurrency,
        },
        {
          label: "Frais de service",
          amount: input.simulation.serviceFee,
          currency: input.simulation.targetCurrency,
        },
      ],
      assumptions: {
        region: input.simulation.region,
        fxRateToXaf: input.simulation.fx.rateToXaf,
        fxReference: input.simulation.fx.reference,
        contributionMonths: input.simulation.input.contributionMonths,
        durationMonths: input.simulation.input.durationMonths ?? 12,
        discountRate: input.simulation.discountRate,
      },
      simulationSnapshot: input.simulation,
      status: "draft",
    };

    return getFintechStore().createQuote(quote);
  }
}
