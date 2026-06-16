import type {
  ClientQuoteView,
  FinancingQuote,
  FinancingSimulation,
} from "@/types/fintech";
import { getFintechStore } from "@/lib/fintech/fintech-store";

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function quoteOwnerUid(quote: FinancingQuote) {
  return quote.uid ?? quote.simulationSnapshot.input.uid ?? null;
}

export function toClientQuoteView(quote: FinancingQuote): ClientQuoteView {
  const simulation = quote.simulationSnapshot;

  return {
    id: quote.id,
    createdAt: quote.createdAt,
    status: quote.status,
    title: quote.title ?? null,
    validUntil: quote.validUntil ?? null,
    paymentDeadline: quote.paymentDeadline ?? null,
    commercialNote: quote.commercialNote ?? null,
    termsAndConditions: quote.termsAndConditions ?? null,
    requiredDocumentsBeforeApproval:
      quote.requiredDocumentsBeforeApproval?.filter(Boolean) ?? [],
    disclaimer: quote.disclaimer ?? null,
    recommendationSummary: quote.recommendationSummary ?? null,
    generatedAt: quote.generatedAt ?? null,
    sentAt: quote.sentAt ?? null,
    expiresAt: quote.expiresAt ?? null,
    pdfAvailable: Boolean(quote.pdfStoragePath),
    lineItems: quote.lineItems,
    simulation: {
      region: simulation.region,
      targetCurrency: simulation.targetCurrency,
      option: simulation.option,
      targetAmount: simulation.targetAmount,
      studentContribution: simulation.studentContribution,
      financedAmount: simulation.financedAmount,
      cashDueAtSignature: simulation.cashDueAtSignature,
      monthlyRepayment: simulation.monthlyRepayment,
      netFees: simulation.netFees,
      totalClientEffort: simulation.totalClientEffort,
    },
  };
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
      status: "DRAFT",
      caseId: input.simulation.input.caseId ?? null,
      uid: input.simulation.input.uid ?? null,
      pdfStoragePath: null,
      generatedAt: null,
      sentAt: null,
      expiresAt: null,
      title: `Devis AVI CERTIFY - ${input.simulation.region === "canada" ? "Canada" : "UE / France"}`,
      validUntil: null,
      paymentDeadline: null,
      commercialNote: "Devis indicatif établi à partir de la simulation financière auditée AVI CERTIFY.",
      internalNote: null,
      termsAndConditions:
        "Ce devis ne vaut pas acceptation définitive. Les conditions finales sont confirmées après revue administrative, documentaire et conformité du dossier.",
      requiredDocumentsBeforeApproval: ["Pièce d'identité", "Lettre d'admission", "Justificatifs financiers"],
      disclaimer:
        "Document commercial non contraignant. Aucune opération de crédit, transfert ou mouvement de fonds n'est exécutée par ce devis.",
      recommendationSummary:
        "Valider les pièces justificatives et la cohérence du dossier avant toute confirmation commerciale finale.",
      deliveryStatus: "PDF_MISSING",
      deliveryMessage: "PDF_MISSING",
      lastDeliveryAttemptAt: null,
      lastEmailMessageId: null,
    };

    return getFintechStore().createQuote(quote);
  }
}
