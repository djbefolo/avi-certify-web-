"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Gauge,
  Landmark,
  Mail,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TableProperties,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  ComparisonResult,
  FinancialAuditEvent,
  FinancialProduct,
  FinancingQuote,
  FinancingSimulation,
  FintechRegion,
  FxRate,
  PricingRule,
  RiskSurchargeRule,
  SensitivityRow,
} from "@/types/fintech";
import type { AdminClientProfile, ClientCase } from "@/types/admin-ops";

type FintechCommandCenterProps = {
  clients?: AdminClientProfile[];
  cases?: ClientCase[];
  initialClientUid?: string;
  initialQuoteId?: string;
  initialSection?: FintechSection;
  onSimulationSaved?: (simulation: FinancingSimulation) => void | Promise<void>;
};

type AdminData = {
  products: FinancialProduct[];
  fxRates: FxRate[];
  pricingRules: PricingRule[];
  riskRules: RiskSurchargeRule[];
  simulations: FinancingSimulation[];
  quotes: FinancingQuote[];
  auditEvents: FinancialAuditEvent[];
  comparison: ComparisonResult;
  sensitivity: { optionA: SensitivityRow[]; optionB: SensitivityRow[] };
};

type ReportView = {
  id: string;
  createdAt: string;
  clientIdentity: Record<string, unknown>;
  targetCountryOrZone: string;
  targetAmount: number;
  targetCurrency: string;
  selectedOption: string;
  feesBreakdown: Record<string, number>;
  repaymentSchedule: Array<{ month: number; repayment: number; closingPrincipal: number }>;
  totalClientEffort: number;
  complianceNotes: string[];
  adminValidationStatus: string;
  deliveryStatus?: "INTERNAL_ONLY" | "SENT" | "SEND_FAILED" | "NOT_SENT";
  emailStatus?: "NOT_SENT" | "SENT" | "SEND_FAILED";
  deliveryNote?: string;
};

type QuoteDraft = {
  title: string;
  validUntil: string;
  paymentDeadline: string;
  commercialNote: string;
  internalNote: string;
  termsAndConditions: string;
  requiredDocumentsBeforeApproval: string;
  disclaimer: string;
  recommendationSummary: string;
};

const navItems = [
  ["Vue d'ensemble", "overview", Gauge],
  ["Simulateur", "simulateur", Calculator],
  ["Comparaison", "comparaison", TableProperties],
  ["Sensibilité", "sensibilite", TrendingUp],
  ["Simulations", "simulations", ClipboardList],
  ["Devis", "devis", FileText],
  ["Rapports", "rapports", BadgeCheck],
  ["FX", "fx", CircleDollarSign],
  ["Pricing", "pricing", SlidersHorizontal],
  ["Risque", "risque", ShieldCheck],
  ["Audit", "audit", Activity],
] as const;

type FintechSection = (typeof navItems)[number][1];

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  style: "percent",
});

function money(value: number | undefined, currency?: string) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${numberFormat.format(value)}${currency ? ` ${currency}` : ""}`;
}

function percent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return percentFormat.format(value);
}

function formatDate(value: string | null | undefined, fallback = "-") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString("fr-FR");
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function displayClientName(client: AdminClientProfile | null | undefined) {
  if (!client) return "";
  if (client.fullName?.trim()) return client.fullName.trim();
  if (client.email?.trim()) return client.email.split("@")[0] || client.email;
  return client.uid;
}

function quotePdfStatus(quote: FinancingQuote) {
  if (quote.deliveryStatus === "GENERATING_FAILED") return "GENERATING_FAILED";
  if (quote.pdfStoragePath || quote.status === "GENERATED" || quote.status === "SENT") return "GENERATED";
  return "PDF_MISSING";
}

function quoteDeliveryStatus(quote: FinancingQuote) {
  if (quote.status === "SENT" || quote.sentAt) return "SENT";
  if (
    quote.deliveryStatus === "SEND_FAILED" ||
    quote.deliveryStatus === "EMAIL_NOT_CONFIGURED" ||
    quote.deliveryStatus === "RECIPIENT_MISSING" ||
    quote.deliveryStatus === "GENERATING_FAILED"
  ) {
    return quote.deliveryStatus;
  }
  return quote.pdfStoragePath ? "NOT_SENT" : "PDF_MISSING";
}

function deliveryStatusClass(status: string) {
  if (status === "SENT") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "GENERATED") return "border-blue-200 bg-blue-50 text-blue-800";
  if (status === "NOT_SENT" || status === "INTERNAL_ONLY" || status === "PDF_MISSING") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

function DeliveryBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${deliveryStatusClass(status)}`}>
      {status}
    </span>
  );
}

function deliveryStatusHint(status: string) {
  const hints: Record<string, string> = {
    GENERATED: "PDF généré, prêt à prévisualiser ou envoyer",
    PDF_MISSING: "PDF absent: cliquez sur Générer PDF",
    GENERATING_FAILED: "Génération PDF échouée: vérifier le code d'erreur",
    SENT: "Email client envoyé",
    SEND_FAILED: "Envoi email échoué",
    EMAIL_NOT_CONFIGURED: "Email non configuré",
    RECIPIENT_MISSING: "Email client manquant",
    NOT_SENT: "PDF prêt, aucun envoi client confirmé",
  };

  return hints[status] ?? "Statut à vérifier";
}

function riskTierLabel(financedShare: number | undefined) {
  if (typeof financedShare !== "number" || Number.isNaN(financedShare)) return "-";
  if (financedShare <= 0.25) return "<=25%";
  if (financedShare <= 0.5) return "25-50%";
  if (financedShare <= 0.75) return "50-75%";
  return "75-100%";
}

function optionLabel(option: FinancingSimulation["option"]) {
  if (option === "option_a_3m") return "Option A - 3 mois";
  if (option === "option_b_0m") return "Option B - 0 mois";
  return "Option personnalisée";
}

function apiHeaders() {
  return { "content-type": "application/json" };
}

async function apiErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
    };
    const message = body.error ?? body.message ?? response.statusText ?? "Admin API error";
    return body.code ? `${message} (${body.code})` : message;
  } catch {
    return response.statusText || "Admin API error";
  }
}

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(`${response.status} ${await apiErrorMessage(response)}`);
  return (await response.json()) as T;
}

async function writeApi<T>(path: string, body: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status} ${await apiErrorMessage(response)}`);
  return (await response.json()) as T;
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Gauge }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="rounded-md bg-emerald-50 p-2 text-emerald-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-base font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-lg bg-white/70" />)}
    </div>
  );
}

function quoteToDraft(quote: FinancingQuote): QuoteDraft {
  return {
    title: quote.title ?? `Devis AVI CERTIFY ${quote.id}`,
    validUntil: dateInputValue(quote.validUntil ?? quote.expiresAt),
    paymentDeadline: dateInputValue(quote.paymentDeadline),
    commercialNote: quote.commercialNote ?? "",
    internalNote: quote.internalNote ?? "",
    termsAndConditions: quote.termsAndConditions ?? "",
    requiredDocumentsBeforeApproval: (quote.requiredDocumentsBeforeApproval ?? []).join("\n"),
    disclaimer: quote.disclaimer ?? "",
    recommendationSummary: quote.recommendationSummary ?? "",
  };
}

function quotePatchFromDraft(draft: QuoteDraft) {
  return {
    title: draft.title || null,
    validUntil: draft.validUntil || null,
    expiresAt: draft.validUntil || null,
    paymentDeadline: draft.paymentDeadline || null,
    commercialNote: draft.commercialNote || null,
    internalNote: draft.internalNote || null,
    termsAndConditions: draft.termsAndConditions || null,
    requiredDocumentsBeforeApproval: draft.requiredDocumentsBeforeApproval
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    disclaimer: draft.disclaimer || null,
    recommendationSummary: draft.recommendationSummary || null,
  };
}

export function FintechCommandCenter({
  clients = [],
  cases = [],
  initialClientUid,
  initialQuoteId,
  initialSection = "simulateur",
  onSimulationSaved,
}: FintechCommandCenterProps = {}) {
  const [data, setData] = useState<AdminData | null>(null);
  const [active, setActive] = useState<FintechSection>(initialSection);
  const [region, setRegion] = useState<FintechRegion>("canada");
  const [xafAmount, setXafAmount] = useState(8_000_000);
  const [durationMonths, setDurationMonths] = useState(12);
  const [contributionMonths, setContributionMonths] = useState(3);
  const [discountRate, setDiscountRate] = useState(0);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedClientUid, setSelectedClientUid] = useState("");
  const [selectedSimulation, setSelectedSimulation] = useState<FinancingSimulation | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<FinancingQuote | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<FinancingQuote | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(nextRegion = region, nextXaf = xafAmount) {
    setIsLoading(true);
    setError(null);
    try {
      const [products, fx, pricing, risk, simulations, quotes, audit, comparison, sensitivity] = await Promise.all([
        readApi<{ products: FinancialProduct[] }>("/api/admin/fintech/products"),
        readApi<{ fxRates: FxRate[] }>("/api/admin/fintech/fx"),
        readApi<{ pricingRules: PricingRule[] }>("/api/admin/fintech/pricing-rules"),
        readApi<{ riskRules: RiskSurchargeRule[] }>("/api/admin/fintech/risk-rules"),
        readApi<{ simulations: FinancingSimulation[] }>("/api/admin/fintech/simulations"),
        readApi<{ quotes: FinancingQuote[] }>("/api/admin/fintech/quotes"),
        readApi<{ auditEvents: FinancialAuditEvent[] }>("/api/admin/fintech/audit-events"),
        readApi<{ comparison: ComparisonResult }>(`/api/admin/fintech/comparison?region=${nextRegion}&xafAmount=${nextXaf}`),
        readApi<{ sensitivity: { optionA: SensitivityRow[]; optionB: SensitivityRow[] } }>(`/api/admin/fintech/sensitivity?region=${nextRegion}`),
      ]);

      setData({
        products: products.products,
        fxRates: fx.fxRates,
        pricingRules: pricing.pricingRules,
        riskRules: risk.riskRules,
        simulations: simulations.simulations,
        quotes: quotes.quotes,
        auditEvents: audit.auditEvents,
        comparison: comparison.comparison,
        sensitivity: sensitivity.sensitivity,
      });
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Admin data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialClientUid) {
      const initialClient = clients.find((client) => client.uid === initialClientUid);
      setSelectedClientUid(initialClientUid);
      if (initialClient) {
        setClientName(displayClientName(initialClient));
        setClientEmail(initialClient.email ?? "");
      }
      return;
    }

    if (!clients.length || selectedClientUid) return;
    const firstClient = clients[0];
    setSelectedClientUid(firstClient.uid);
    setClientName(displayClientName(firstClient));
    setClientEmail(firstClient.email ?? "");
  }, [clients, initialClientUid, selectedClientUid]);

  useEffect(() => {
    if (!initialQuoteId || !data?.quotes.length) return;
    const quote = data.quotes.find((item) => item.id === initialQuoteId);
    if (quote) {
      setSelectedQuote(quote);
      setQuoteSuccess(quote);
      setActive("devis");
    }
  }, [data?.quotes, initialQuoteId]);

  useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  const selectedClient = clients.find((client) => client.uid === selectedClientUid) ?? null;
  const selectedClientCase = cases.find((clientCase) => clientCase.uid === selectedClientUid) ?? null;
  const currentCurrency = data?.comparison?.targetCurrency ?? (region === "canada" ? "CAD" : "EUR");
  const optionA = data?.comparison?.optionA;
  const optionB = data?.comparison?.optionB;
  const selectedForQuote = selectedSimulation ?? optionA ?? null;

  const metrics = useMemo(() => {
    const simulations = data?.simulations ?? [];
    const quotes = data?.quotes ?? [];
    const auditEvents = data?.auditEvents ?? [];
    const reports = auditEvents.filter((event) => event.type === "report_generated");
    const exposure = simulations.reduce((sum, item) => sum + item.financedAmount, 0);
    const fees = simulations.reduce((sum, item) => sum + item.netFees, 0);
    const avgFeeLoad = simulations.length
      ? simulations.reduce((sum, item) => sum + item.feeLoadOnTargetAmount, 0) / simulations.length
      : 0;
    const canada = simulations.filter((item) => item.region === "canada").length;
    const eu = simulations.filter((item) => item.region === "eu").length;

    return {
      simulations: simulations.length,
      quotes: quotes.length,
      exposure,
      fees,
      avgFeeLoad,
      split: simulations.length ? `${canada} Canada / ${eu} UE` : "Aucune simulation enregistrée",
      reports: reports.length,
      activity: auditEvents.length,
    };
  }, [data]);

  function updateQuoteInState(quote: FinancingQuote) {
    setSelectedQuote(quote);
    setQuoteSuccess(quote);
    setData((current) => {
      if (!current) return current;
      const exists = current.quotes.some((item) => item.id === quote.id);
      return {
        ...current,
        quotes: exists
          ? current.quotes.map((item) => (item.id === quote.id ? quote : item))
          : [quote, ...current.quotes],
      };
    });
  }

  async function runComparison(event?: FormEvent) {
    event?.preventDefault();
    await load(region, xafAmount);
    setNotice("Comparaison recalculée depuis les APIs admin protégées.");
  }

  async function createSimulation(months = contributionMonths) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ simulation: FinancingSimulation }>("/api/admin/fintech/simulations", {
        region,
        xafAmount,
        durationMonths,
        contributionMonths: months,
        discountRate,
        clientName,
        clientEmail: clientEmail || undefined,
        uid: selectedClient?.uid,
        caseId: selectedClientCase?.id,
        fxReference: "Admin command center",
      });
      setSelectedSimulation(response.simulation);
      setNotice(`Simulation enregistrée: ${response.simulation.id}`);
      await load(region, xafAmount);
      await onSimulationSaved?.(response.simulation);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Simulation impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createQuote(simulation = selectedForQuote) {
    if (!simulation) {
      setError("Créez une simulation avant de générer un devis.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ quote: FinancingQuote }>("/api/admin/fintech/quotes", {
        simulationId: simulation.id,
        clientIdentity: {
          fullName: simulation.input.clientName ?? clientName,
          email: simulation.input.clientEmail ?? clientEmail,
          phone: selectedClient?.phone,
        },
        simulationInput: {
          region: simulation.region,
          xafAmount: simulation.xafEquivalent.targetAmount,
          durationMonths: simulation.input.durationMonths ?? durationMonths,
          contributionMonths: simulation.input.contributionMonths,
          discountRate: simulation.discountRate,
          clientName: simulation.input.clientName ?? clientName,
          clientEmail: simulation.input.clientEmail ?? (clientEmail || undefined),
          uid: simulation.input.uid ?? selectedClient?.uid,
          caseId: simulation.input.caseId ?? selectedClientCase?.id,
        },
      });

      updateQuoteInState(response.quote);
      setActive("devis");
      setNotice(`Devis créé: ${response.quote.id}. Ouvrez l'espace devis pour générer le PDF ou l'envoyer au client.`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Devis impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateReport(simulation = selectedForQuote) {
    if (!simulation) {
      setError("Créez ou sélectionnez une simulation avant le rapport.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ report: ReportView }>("/api/admin/fintech/reports", {
        clientIdentity: { fullName: clientName, email: clientEmail },
        simulationInput: {
          region: simulation.region,
          xafAmount: simulation.xafEquivalent.targetAmount,
          durationMonths,
          contributionMonths,
          discountRate,
          clientName,
          clientEmail: clientEmail || undefined,
          uid: selectedClient?.uid,
          caseId: selectedClientCase?.id,
        },
      });
      setReport(response.report);
      setActive("rapports");
      setNotice(`Rapport généré: ${response.report.id}`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Rapport impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateQuotePdf(quote: FinancingQuote) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ quote: FinancingQuote }>(`/api/admin/fintech/quotes/${quote.id}/generate`, {});
      updateQuoteInState(response.quote);
      setActive("devis");
      setNotice(`PDF devis généré: ${response.quote.id}. Les actions Voir et Télécharger sont maintenant disponibles.`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Génération PDF impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function sendQuote(quote: FinancingQuote) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{
        quote: FinancingQuote;
        email: { sent: boolean; status?: FinancingQuote["deliveryStatus"]; messageId?: string | null };
      }>(`/api/admin/fintech/quotes/${quote.id}/send`, {});
      updateQuoteInState(response.quote);
      setNotice(
        response.email.sent
          ? `Devis envoyé: ${response.quote.id}`
          : `Envoi devis non confirmé: ${response.email.status ?? response.quote.deliveryStatus ?? "SEND_FAILED"}`,
      );
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Envoi devis impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function patchQuote(quote: FinancingQuote, patch: Partial<FinancingQuote>) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ quote: FinancingQuote }>(`/api/admin/fintech/quotes/${quote.id}`, patch, "PATCH");
      updateQuoteInState(response.quote);
      setNotice(`Devis mis à jour: ${response.quote.id}`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Mise à jour devis impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateFx(rate: FxRate) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/fx", { pair: rate.pair, rate: Number(rate.rate) }, "PATCH");
      setNotice(`FX mis à jour: ${rate.pair}`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Mise à jour FX impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updatePricing(rule: PricingRule) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/pricing-rules", {
        region: rule.region,
        serviceFee: rule.serviceFee,
        baseFinancingFeeRate: rule.baseFinancingFeeRate,
        transferFeeRate: rule.transferFeeRate,
        minimumTransferFee: rule.minimumTransferFee,
        discountRateOptionA: rule.discountRateOptionA,
        discountRateOptionB: rule.discountRateOptionB,
      }, "PATCH");
      setNotice(`Pricing mis à jour: ${rule.region}`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Mise à jour pricing impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateRisk(rule: RiskSurchargeRule) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/risk-rules", { region: rule.region, tiers: rule.tiers }, "PATCH");
      setNotice(`Risque mis à jour: ${rule.region}`);
      await load(region, xafAmount);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Mise à jour risque impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[hsl(222,75%,8%)] text-white lg:block">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <Landmark className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">AVI CERTIFY</p>
                <p className="text-xs text-slate-300">Command center</p>
              </div>
            </div>
            <nav className="mt-8 space-y-1" aria-label="Admin fintech navigation">
              {navItems.map(([label, key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    active === key ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-emerald-700">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin privé - aucune opération financière exécutée
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">AVI CERTIFY fintech command center</h1>
              </div>
              <Button type="button" variant="ghost" onClick={() => void load(region, xafAmount)}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Actualiser
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 lg:px-8">
              {navItems.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${
                    active === key ? "border-slate-950 bg-slate-950 text-white" : "bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="px-4 py-6 lg:px-8">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Source: APIs admin protégées</span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {metrics.simulations ? "Source: simulations enregistrées" : "Aucune donnée enregistrée"}
              </span>
            </div>
            {notice ? <p role="status" className="mb-5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
            {error ? (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">Erreur opérationnelle admin</p>
                <p className="mt-1">{error}</p>
              </div>
            ) : null}
            {isLoading ? <LoadingState /> : null}
            {!isLoading && !data ? <EmptyState title="Données admin protégées non chargées" text="Les données financières restent protégées derrière les API admin." /> : null}
            {!isLoading && data ? (
              <div className="space-y-6">
                {active === "overview" ? <Overview metrics={metrics} currentCurrency={currentCurrency} sensitivity={data.sensitivity ?? { optionA: [], optionB: [] }} /> : null}
                {active === "simulateur" && !data.comparison ? (
                  <EmptyState title="Comparaison indisponible" text="Le simulateur attend la réponse de l'API de comparaison protégée." />
                ) : null}
                {active === "simulateur" && data.comparison ? (
                  <SimulationCockpit
                    region={region}
                    setRegion={setRegion}
                    xafAmount={xafAmount}
                    setXafAmount={setXafAmount}
                    durationMonths={durationMonths}
                    setDurationMonths={setDurationMonths}
                    contributionMonths={contributionMonths}
                    setContributionMonths={setContributionMonths}
                    discountRate={discountRate}
                    setDiscountRate={setDiscountRate}
                    clients={clients}
                    selectedClientUid={selectedClientUid}
                    setSelectedClientUid={setSelectedClientUid}
                    setClientName={setClientName}
                    setClientEmail={setClientEmail}
                    clientName={clientName}
                    clientEmail={clientEmail}
                    optionA={optionA}
                    optionB={optionB}
                    comparison={data.comparison}
                    currency={currentCurrency}
                    isBusy={isBusy}
                    onCompare={runComparison}
                    onSave={() => void createSimulation(contributionMonths)}
                    onQuote={() => void createQuote()}
                    onReport={() => void generateReport()}
                    onSelectSimulation={setSelectedSimulation}
                  />
                ) : null}
                {active === "comparaison" && data.comparison ? <ComparisonWorkspace comparison={data.comparison} currency={currentCurrency} /> : null}
                {active === "comparaison" && !data.comparison ? <EmptyState title="Comparaison indisponible" text="Aucun résultat Option A / Option B chargé." /> : null}
                {active === "sensibilite" ? <SensitivityWorkspace sensitivity={data.sensitivity ?? { optionA: [], optionB: [] }} currency={currentCurrency} /> : null}
                {active === "simulations" || active === "devis" ? (
                  <HistoryTables
                    simulations={data.simulations}
                    quotes={data.quotes}
                    active={active}
                    quoteSuccess={quoteSuccess}
                    onQuote={(simulation) => void createQuote(simulation)}
                    onReport={(simulation) => void generateReport(simulation)}
                    onOpenQuote={(quote) => {
                      setSelectedQuote(quote);
                      setQuoteSuccess(quote);
                    }}
                    onGenerateQuote={(quote) => void generateQuotePdf(quote)}
                    onSendQuote={(quote) => void sendQuote(quote)}
                    onExpireQuote={(quote) => void patchQuote(quote, { status: "EXPIRED" })}
                  />
                ) : null}
                {active === "fx" ? <FxPanel rates={data.fxRates} isBusy={isBusy} onUpdate={updateFx} /> : null}
                {active === "pricing" ? <PricingPanel rules={data.pricingRules} isBusy={isBusy} onUpdate={updatePricing} /> : null}
                {active === "risque" ? <RiskPanel rules={data.riskRules} isBusy={isBusy} onUpdate={updateRisk} /> : null}
                {active === "rapports" ? <ReportsWorkspace report={report} events={data.auditEvents} /> : null}
                {active === "audit" ? <AuditLog events={data.auditEvents} /> : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {selectedQuote ? (
        <QuoteWorkspaceDrawer
          quote={selectedQuote}
          clientCase={cases.find((item) => item.id === selectedQuote.caseId) ?? null}
          auditEvents={data?.auditEvents ?? []}
          isBusy={isBusy}
          onClose={() => setSelectedQuote(null)}
          onSave={(patch) => void patchQuote(selectedQuote, patch)}
          onGenerate={() => void generateQuotePdf(selectedQuote)}
          onSend={() => void sendQuote(selectedQuote)}
          onExpire={() => void patchQuote(selectedQuote, { status: "EXPIRED" })}
        />
      ) : null}
    </main>
  );
}

function Overview({ metrics, currentCurrency, sensitivity }: { metrics: { simulations: number; quotes: number; exposure: number; fees: number; avgFeeLoad: number; split: string; reports: number; activity: number }; currentCurrency: string; sensitivity: { optionA: SensitivityRow[]; optionB: SensitivityRow[] } }) {
  return (
    <section className="space-y-6" aria-labelledby="overview-title">
      <div><h2 id="overview-title" className="text-xl font-semibold">Vue d'ensemble</h2><p className="mt-1 text-sm text-slate-600">Indicateurs calculés depuis les APIs admin protégées.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total simulations" value={String(metrics.simulations)} detail="Scénarios sauvegardés" icon={Calculator} />
        <MetricCard label="Total quotes" value={String(metrics.quotes)} detail="Objets devis internes" icon={FileText} />
        <MetricCard label="Financed exposure" value={money(metrics.exposure, currentCurrency)} detail="Exposition financée sauvegardée" icon={Landmark} />
        <MetricCard label="Expected fees" value={money(metrics.fees, currentCurrency)} detail="Frais nets sauvegardés" icon={BarChart3} />
        <MetricCard label="Average fee load" value={percent(metrics.avgFeeLoad)} detail="Frais nets / montant cible" icon={Gauge} />
        <MetricCard label="Canada vs UE split" value={metrics.split} detail="Mix régional" icon={TableProperties} />
        <MetricCard label="Pending reports" value={String(metrics.reports)} detail="Rapports à valider" icon={ClipboardList} />
        <MetricCard label="Recent activity" value={String(metrics.activity)} detail="Événements audit" icon={Activity} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <MiniBarChart title="Cash due sensitivity" rows={sensitivity.optionA} valueKey="cashDueAtSignature" currency={currentCurrency} />
        <MiniBarChart title="Monthly repayment" rows={sensitivity.optionA} valueKey="monthlyRepayment" currency={currentCurrency} />
      </div>
    </section>
  );
}

function SimulationCockpit(props: {
  region: FintechRegion;
  setRegion: (value: FintechRegion) => void;
  xafAmount: number;
  setXafAmount: (value: number) => void;
  durationMonths: number;
  setDurationMonths: (value: number) => void;
  contributionMonths: number;
  setContributionMonths: (value: number) => void;
  discountRate: number;
  setDiscountRate: (value: number) => void;
  clients: AdminClientProfile[];
  selectedClientUid: string;
  setSelectedClientUid: (value: string) => void;
  setClientName: (value: string) => void;
  setClientEmail: (value: string) => void;
  clientName: string;
  clientEmail: string;
  optionA: FinancingSimulation | undefined;
  optionB: FinancingSimulation | undefined;
  comparison: ComparisonResult;
  currency: string;
  isBusy: boolean;
  onCompare: (event?: FormEvent) => void;
  onSave: () => void;
  onQuote: () => void;
  onReport: () => void;
  onSelectSimulation: (simulation: FinancingSimulation) => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="simulation-title">
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h2 id="simulation-title" className="text-xl font-semibold">Simulation cockpit</h2>
        <form onSubmit={props.onCompare} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          <label className="grid gap-1 text-sm font-medium">Région<Select value={props.region} onChange={(event) => props.setRegion(event.target.value as FintechRegion)}><option value="canada">Canada CAD/XAF</option><option value="eu">UE EUR/XAF</option></Select></label>
          <label className="grid gap-1 text-sm font-medium">Montant XAF<Input type="number" value={props.xafAmount} onChange={(event) => props.setXafAmount(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-sm font-medium">Durée<Input type="number" min="1" value={props.durationMonths} onChange={(event) => props.setDurationMonths(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-sm font-medium">Contribution<Select value={String(props.contributionMonths)} onChange={(event) => props.setContributionMonths(Number(event.target.value))}><option value="3">Option A - 3 mois</option><option value="0">Option B - 0 mois</option></Select></label>
          <label className="grid gap-1 text-sm font-medium">Remise<Input type="number" step="0.01" value={props.discountRate} onChange={(event) => props.setDiscountRate(Number(event.target.value))} /></label>
          <label className="grid gap-1 text-sm font-medium">Client synchronisé<Select value={props.selectedClientUid} onChange={(event) => { const uid = event.target.value; const client = props.clients.find((item) => item.uid === uid) ?? null; props.setSelectedClientUid(uid); if (client) { props.setClientName(displayClientName(client)); props.setClientEmail(client.email ?? ""); } }}><option value="">Sélectionner un client</option>{props.clients.map((client) => <option key={client.uid} value={client.uid}>{client.fullName ?? client.email ?? client.uid}</option>)}</Select></label>
          <label className="grid gap-1 text-sm font-medium">Nom client<Input value={props.clientName} onChange={(event) => props.setClientName(event.target.value)} /></label>
          <label className="grid gap-1 text-sm font-medium">Client email<Input type="email" value={props.clientEmail} onChange={(event) => props.setClientEmail(event.target.value)} /></label>
          <div className="flex items-end"><Button type="submit" className="w-full">Générer simulation</Button></div>
        </form>
        <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Source: Engine computed via protected admin APIs</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {[props.optionA, props.optionB].map((simulation, index) => simulation ? (
          <SimulationCard key={simulation.option} simulation={simulation} label={index === 0 ? "Option A - 3 mois" : "Option B - 0 mois"} onSelect={() => props.onSelectSimulation(simulation)} />
        ) : null)}
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-950">Recommendation summary</p>
        <p className="mt-2 text-sm text-emerald-900">Option A lowers monthly repayment by {money(props.comparison.deltaOptionBMinusA.monthlyRepayment, props.currency)} versus Option B. Canada delta is recalculated from scenario outputs to preserve the audited correction.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={props.isBusy} onClick={props.onSave}>Enregistrer simulation</Button>
          <Button disabled={props.isBusy} variant="outline" onClick={props.onQuote}>Créer devis</Button>
          <Button disabled={props.isBusy} variant="outline" onClick={props.onReport}>Générer rapport</Button>
        </div>
      </div>
    </section>
  );
}

function SimulationCard({ simulation, label, onSelect }: { simulation: FinancingSimulation; label: string; onSelect: () => void }) {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase text-emerald-700">{label}</p><h3 className="mt-1 text-lg font-semibold">{simulation.region === "canada" ? "Canada" : "UE"} {simulation.targetCurrency}</h3></div>
        <Button type="button" size="sm" variant="outline" onClick={onSelect}>Sélectionner</Button>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Target amount", money(simulation.targetAmount, simulation.targetCurrency)],
          ["Student contribution", money(simulation.studentContribution, simulation.targetCurrency)],
          ["AVI financed", money(simulation.financedAmount, simulation.targetCurrency)],
          ["Financed share", percent(simulation.financedShare)],
          ["Risk surcharge", percent(simulation.riskSurchargeRate)],
          ["Financing fee", money(simulation.financingFee, simulation.targetCurrency)],
          ["Transfer fee", money(simulation.transferFee, simulation.targetCurrency)],
          ["Service fee", money(simulation.serviceFee, simulation.targetCurrency)],
          ["Net fees", money(simulation.netFees, simulation.targetCurrency)],
          ["Cash due", money(simulation.cashDueAtSignature, simulation.targetCurrency)],
          ["Monthly repayment", money(simulation.monthlyRepayment, simulation.targetCurrency)],
          ["Fee load", percent(simulation.feeLoadOnTargetAmount)],
          ["XAF equivalent", money(simulation.xafEquivalent.targetAmount, "XAF")],
          ["Risk tier", riskTierLabel(simulation.financedShare)],
        ].map(([labelItem, value]) => <div key={labelItem} className="rounded-md bg-slate-50 p-3"><dt className="text-xs text-slate-500">{labelItem}</dt><dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd></div>)}
      </dl>
    </div>
  );
}

function ComparisonWorkspace({ comparison, currency }: { comparison: ComparisonResult; currency: string }) {
  const rows = [
    ["Cash due", comparison.deltaOptionBMinusA.cashDueAtSignature],
    ["Monthly repayment", comparison.deltaOptionBMinusA.monthlyRepayment],
    ["Financed exposure", comparison.deltaOptionBMinusA.financedAmount],
    ["Fee load", comparison.optionB.feeLoadOnTargetAmount - comparison.optionA.feeLoadOnTargetAmount],
  ] as const;
  return (
    <section className="space-y-6" aria-labelledby="comparison-title">
      <div><h2 id="comparison-title" className="text-xl font-semibold">Option A vs Option B comparison</h2><p className="mt-1 text-sm text-slate-600">Side-by-side prefinancing workspace generated by protected admin APIs.</p><p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Source: Engine computed</p></div>
      <div className="grid gap-4 xl:grid-cols-2">{[comparison.optionA, comparison.optionB].map((simulation) => <SimulationCard key={simulation.option} simulation={simulation} label={optionLabel(simulation.option)} onSelect={() => undefined} />)}</div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-950">Deltas Option B - Option A</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">{rows.map(([label, value]) => <div key={label} className="rounded-md bg-white/80 p-3"><p className="text-xs text-emerald-900">{label}</p><p className="mt-1 text-sm font-semibold text-emerald-950">{label === "Fee load" ? percent(value) : money(value, currency)}</p></div>)}</div>
        <p className="mt-4 text-sm text-emerald-900">Recommendation: Option A reduces monthly repayment by {money(comparison.deltaOptionBMinusA.monthlyRepayment, currency)} versus Option B. For Canada, the corrected monthly delta remains 407,29 CAD when the audited 8M XAF scenario is selected.</p>
      </div>
    </section>
  );
}

function MiniBarChart({ title, rows, valueKey, currency }: { title: string; rows: SensitivityRow[]; valueKey: keyof SensitivityRow; currency: string }) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">{rows.slice(0, 7).map((row) => { const value = Number(row[valueKey]) || 0; return <div key={`${title}-${row.targetAmount}`} className="grid grid-cols-[74px_1fr_110px] items-center gap-3 text-xs"><span className="text-slate-500">{money(row.targetAmount, currency)}</span><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max((value / max) * 100, 4)}%` }} /></div><span className="text-right font-semibold text-slate-800">{money(value, currency)}</span></div>; })}</div>
    </div>
  );
}

function SensitivityWorkspace({ sensitivity, currency }: { sensitivity: { optionA: SensitivityRow[]; optionB: SensitivityRow[] }; currency: string }) {
  return (
    <section className="space-y-4" aria-labelledby="sensitivity-title">
      <div><h2 id="sensitivity-title" className="text-xl font-semibold">Sensibilité</h2><p className="mt-1 text-sm text-slate-600">Source: Engine computed via protected sensitivity API.</p></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <MiniBarChart title="Option A cash due" rows={sensitivity.optionA} valueKey="cashDueAtSignature" currency={currency} />
        <MiniBarChart title="Option B cash due" rows={sensitivity.optionB} valueKey="cashDueAtSignature" currency={currency} />
        <MiniBarChart title="Option A fee load proxy" rows={sensitivity.optionA} valueKey="netFees" currency={currency} />
        <MiniBarChart title="Option B monthly repayment" rows={sensitivity.optionB} valueKey="monthlyRepayment" currency={currency} />
      </div>
    </section>
  );
}

function ManagementPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4" aria-labelledby={`${title}-title`}><div><h2 id={`${title}-title`} className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">Updates are routed through protected admin APIs and recorded in the financial audit log.</p></div>{children}</section>;
}

function FxPanel({ rates, isBusy, onUpdate }: { rates: FxRate[]; isBusy: boolean; onUpdate: (rate: FxRate) => void }) {
  return <ManagementPanel title="FX rates"><div className="grid gap-3">{rates.map((rate) => <div key={rate.id} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_160px_160px_auto] md:items-center"><div><p className="font-semibold">{rate.pair}</p><p className="text-sm text-slate-600">{rate.source} - {new Date(rate.validAt).toLocaleDateString("fr-FR")}</p></div><Input type="number" step="0.0001" defaultValue={rate.rate} onChange={(event) => { rate.rate = Number(event.target.value); }} /><span className="text-sm text-slate-600">{rate.sourceMetadata}</span><Button disabled={isBusy} onClick={() => onUpdate(rate)}>Update</Button></div>)}</div></ManagementPanel>;
}

function PricingPanel({ rules, isBusy, onUpdate }: { rules: PricingRule[]; isBusy: boolean; onUpdate: (rule: PricingRule) => void }) {
  return <ManagementPanel title="Pricing rules"><div className="grid gap-4 xl:grid-cols-2">{rules.map((rule) => <div key={rule.id} className="rounded-lg border bg-white p-5 shadow-sm"><h3 className="font-semibold">{rule.region.toUpperCase()} pricing</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><NumberField label="Service fee" value={rule.serviceFee} onChange={(value) => { rule.serviceFee = value; }} /><NumberField label="Base financing fee" value={rule.baseFinancingFeeRate} step="0.0001" onChange={(value) => { rule.baseFinancingFeeRate = value; }} /><NumberField label="Transfer fee" value={rule.transferFeeRate} step="0.0001" onChange={(value) => { rule.transferFeeRate = value; }} /><NumberField label="Minimum transfer" value={rule.minimumTransferFee} onChange={(value) => { rule.minimumTransferFee = value; }} /></div><p className="mt-4 text-sm text-slate-600">{rule.feePolicy}</p><Button className="mt-4" disabled={isBusy} onClick={() => onUpdate(rule)}>Update pricing</Button></div>)}</div></ManagementPanel>;
}

function RiskPanel({ rules, isBusy, onUpdate }: { rules: RiskSurchargeRule[]; isBusy: boolean; onUpdate: (rule: RiskSurchargeRule) => void }) {
  return <ManagementPanel title="Risk surcharge tiers"><div className="grid gap-4 xl:grid-cols-2">{rules.map((rule) => <div key={rule.id} className="rounded-lg border bg-white p-5 shadow-sm"><h3 className="font-semibold">{rule.region.toUpperCase()} risk tiers</h3><div className="mt-4 space-y-3">{rule.tiers.map((tier, index) => <div key={tier.label} className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-3"><Input aria-label="Tier label" defaultValue={tier.label} onChange={(event) => { tier.label = event.target.value; }} /><Input aria-label="Max financed share" type="number" step="0.01" defaultValue={tier.maxFinancedShare} onChange={(event) => { rule.tiers[index].maxFinancedShare = Number(event.target.value); }} /><Input aria-label="Surcharge rate" type="number" step="0.001" defaultValue={tier.surchargeRate} onChange={(event) => { rule.tiers[index].surchargeRate = Number(event.target.value); }} /></div>)}</div><Button className="mt-4" disabled={isBusy} onClick={() => onUpdate(rule)}>Update risk tiers</Button></div>)}</div></ManagementPanel>;
}

function NumberField({ label, value, step = "1", onChange }: { label: string; value: number; step?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-sm font-medium">{label}<Input type="number" step={step} defaultValue={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function QuoteSuccessPanel({
  quote,
  onOpen,
  onGenerate,
}: {
  quote: FinancingQuote | null;
  onOpen: (quote: FinancingQuote) => void;
  onGenerate: (quote: FinancingQuote) => void;
}) {
  if (!quote) return null;
  const simulation = quote.simulationSnapshot;
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5" aria-label="Devis créé">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-800">Devis créé</p>
          <h3 className="mt-1 text-lg font-semibold text-emerald-950">{quote.id}</h3>
          <p className="mt-1 text-sm text-emerald-900">
            {quote.clientIdentity.fullName ?? quote.clientIdentity.email ?? "Client à qualifier"} · {money(simulation.targetAmount, simulation.targetCurrency)} · {quote.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onOpen(quote)}>Ouvrir le devis</Button>
          <Button type="button" variant="outline" onClick={() => onGenerate(quote)}>Générer PDF</Button>
          <Button type="button" variant="outline" onClick={() => onOpen(quote)}>Voir dans Devis</Button>
        </div>
      </div>
    </section>
  );
}

function HistoryTables({
  simulations,
  quotes,
  active,
  quoteSuccess,
  onQuote,
  onReport,
  onOpenQuote,
  onGenerateQuote,
  onSendQuote,
  onExpireQuote,
}: {
  simulations: FinancingSimulation[];
  quotes: FinancingQuote[];
  active: string;
  quoteSuccess: FinancingQuote | null;
  onQuote: (simulation: FinancingSimulation) => void;
  onReport: (simulation: FinancingSimulation) => void;
  onOpenQuote: (quote: FinancingQuote) => void;
  onGenerateQuote: (quote: FinancingQuote) => void;
  onSendQuote: (quote: FinancingQuote) => void;
  onExpireQuote: (quote: FinancingQuote) => void;
}) {
  if (active === "simulations") {
    return (
      <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="simulations-history">
        <div className="border-b p-5"><h2 id="simulations-history" className="text-lg font-semibold">Historique des simulations</h2></div>
        {simulations.length ? <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Date", "Client", "Region", "XAF", "Option", "Financed", "Cash due", "Monthly", "Fee load", "Actions"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody>{simulations.map((simulation) => <tr key={simulation.id} className="border-t"><td className="px-4 py-3">{formatDate(simulation.createdAt)}</td><td className="px-4 py-3">{simulation.input.clientName ?? simulation.input.clientEmail ?? "-"}</td><td className="px-4 py-3">{simulation.region}</td><td className="px-4 py-3">{money(simulation.xafEquivalent.targetAmount, "XAF")}</td><td className="px-4 py-3">{simulation.option}</td><td className="px-4 py-3">{money(simulation.financedAmount, simulation.targetCurrency)}</td><td className="px-4 py-3">{money(simulation.cashDueAtSignature, simulation.targetCurrency)}</td><td className="px-4 py-3">{money(simulation.monthlyRepayment, simulation.targetCurrency)}</td><td className="px-4 py-3">{percent(simulation.feeLoadOnTargetAmount)}</td><td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onQuote(simulation)}>Créer devis</Button><Button size="sm" variant="ghost" onClick={() => onReport(simulation)}>Rapport</Button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Aucune simulation enregistrée" text="Enregistrez une simulation depuis le cockpit pour alimenter cet historique." />}
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="quotes-history">
      <QuoteSuccessPanel quote={quoteSuccess} onOpen={onOpenQuote} onGenerate={onGenerateQuote} />
      <section className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 id="quotes-history" className="text-lg font-semibold">Gestion des devis</h2>
          <p className="mt-1 text-sm text-slate-600">
            Workspace commercial: revue client, simulation liée, PDF, envoi email, statut livraison et trace opérationnelle.
          </p>
        </div>
        {quotes.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Quote ID", "Client", "Email", "Case ID", "Region", "Option", "Target amount", "Cash due", "Monthly", "Total effort", "Quote status", "PDF status", "Delivery", "Valid until", "Last sent", "Actions"].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const simulation = quote.simulationSnapshot;
                  const pdfStatus = quotePdfStatus(quote);
                  const delivery = quoteDeliveryStatus(quote);
                  const canView = Boolean(quote.pdfStoragePath);
                  return (
                    <tr key={quote.id} className="border-t align-top">
                      <td className="px-4 py-3 font-mono text-xs">{quote.id}</td>
                      <td className="px-4 py-3">{quote.clientIdentity.fullName ?? "-"}</td>
                      <td className="px-4 py-3">{quote.clientIdentity.email ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{quote.caseId ?? simulation.input.caseId ?? "-"}</td>
                      <td className="px-4 py-3">{simulation.region}</td>
                      <td className="px-4 py-3">{simulation.option}</td>
                      <td className="px-4 py-3">{money(simulation.targetAmount, simulation.targetCurrency)}</td>
                      <td className="px-4 py-3">{money(simulation.cashDueAtSignature, simulation.targetCurrency)}</td>
                      <td className="px-4 py-3">{money(simulation.monthlyRepayment, simulation.targetCurrency)}</td>
                      <td className="px-4 py-3">{money(simulation.totalClientEffort, simulation.targetCurrency)}</td>
                      <td className="px-4 py-3"><DeliveryBadge status={quote.status} /></td>
                      <td className="px-4 py-3"><DeliveryBadge status={pdfStatus} /><p className="mt-1 text-xs text-slate-500">{deliveryStatusHint(pdfStatus)}</p></td>
                      <td className="px-4 py-3"><DeliveryBadge status={delivery} /><p className="mt-1 text-xs text-slate-500">{deliveryStatusHint(delivery)}</p></td>
                      <td className="px-4 py-3">{formatDate(quote.validUntil ?? quote.expiresAt, "À définir")}</td>
                      <td className="px-4 py-3">{formatDate(quote.sentAt, "Jamais envoyé")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => onOpenQuote(quote)}>Ouvrir</Button>
                          <Button size="sm" variant="outline" onClick={() => onGenerateQuote(quote)}>Générer PDF</Button>
                          <Button size="sm" variant="ghost" disabled={!canView} title={canView ? "Voir le PDF" : "Générez le PDF avant la prévisualisation"} onClick={() => window.open(`/api/admin/fintech/quotes/${quote.id}/preview`, "_blank", "noopener,noreferrer")}>Voir PDF</Button>
                          <Button size="sm" variant="ghost" disabled={!canView} title={canView ? "Télécharger le PDF" : "Générez le PDF avant le téléchargement"} onClick={() => window.open(`/api/admin/fintech/quotes/${quote.id}/download`, "_blank", "noopener,noreferrer")}>Télécharger</Button>
                          <Button size="sm" variant="outline" onClick={() => onSendQuote(quote)}>Envoyer</Button>
                          <Button size="sm" variant="ghost" onClick={() => onExpireQuote(quote)}>Marquer expiré</Button>
                          <Button size="sm" variant="ghost" disabled title="Variante commerciale prévue plus tard">Dupliquer</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Aucun devis généré" text="Créez un devis depuis une simulation enregistrée." />
        )}
      </section>
    </section>
  );
}

function QuoteWorkspaceDrawer({
  quote,
  clientCase,
  auditEvents,
  isBusy,
  onClose,
  onSave,
  onGenerate,
  onSend,
  onExpire,
}: {
  quote: FinancingQuote;
  clientCase: ClientCase | null;
  auditEvents: FinancialAuditEvent[];
  isBusy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<FinancingQuote>) => void;
  onGenerate: () => void;
  onSend: () => void;
  onExpire: () => void;
}) {
  const [draft, setDraft] = useState(() => quoteToDraft(quote));
  const simulation = quote.simulationSnapshot;
  const pdfStatus = quotePdfStatus(quote);
  const delivery = quoteDeliveryStatus(quote);
  const canView = Boolean(quote.pdfStoragePath);
  const quoteEvents = auditEvents.filter((event) => {
    const metadata = event.metadata ?? {};
    return event.resourceId === quote.id || event.targetId === quote.id || metadata.quoteId === quote.id;
  });

  useEffect(() => {
    setDraft(quoteToDraft(quote));
  }, [quote]);

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-5xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl" aria-labelledby="quote-workspace-title">
      <div className="sticky top-0 z-10 border-b bg-white/95 p-5 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-700">Quote workspace</p>
            <h2 id="quote-workspace-title" className="mt-1 text-2xl font-semibold">Devis commercial - {quote.id}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {quote.clientIdentity.fullName ?? "Client à qualifier"} · {quote.clientIdentity.email ?? "email manquant"} · {clientCase?.caseNumber ?? quote.caseId ?? "dossier non lié"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onGenerate} disabled={isBusy}>
              <FileText className="h-4 w-4" />
              Générer PDF
            </Button>
            <Button type="button" variant="outline" disabled={!canView} title={canView ? "Prévisualiser le PDF" : "Générez le PDF avant la prévisualisation"} onClick={() => window.open(`/api/admin/fintech/quotes/${quote.id}/preview`, "_blank", "noopener,noreferrer")}>
              <Eye className="h-4 w-4" />
              Voir PDF
            </Button>
            <Button type="button" variant="outline" disabled={!canView} title={canView ? "Télécharger le PDF" : "Générez le PDF avant le téléchargement"} onClick={() => window.open(`/api/admin/fintech/quotes/${quote.id}/download`, "_blank", "noopener,noreferrer")}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
            <Button type="button" onClick={onSend} disabled={isBusy}>
              <Mail className="h-4 w-4" />
              Envoyer
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} aria-label="Fermer le devis">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <WorkspaceSection title="Identité client">
            <dl className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Nom" value={quote.clientIdentity.fullName ?? "-"} />
              <InfoItem label="Email" value={quote.clientIdentity.email ?? "-"} />
              <InfoItem label="Téléphone" value={quote.clientIdentity.phone ?? "-"} />
              <InfoItem label="UID" value={quote.uid ?? simulation.input.uid ?? "-"} mono />
              <InfoItem label="Case ID" value={quote.caseId ?? simulation.input.caseId ?? "-"} mono />
              <InfoItem label="Statut dossier" value={clientCase?.status ?? "-"} />
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Simulation source">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem label="Région" value={simulation.region} />
              <InfoItem label="Montant XAF" value={money(simulation.xafEquivalent.targetAmount, "XAF")} />
              <InfoItem label="Devise" value={simulation.targetCurrency} />
              <InfoItem label="Option" value={optionLabel(simulation.option)} />
              <InfoItem label="Durée" value={`${simulation.input.durationMonths ?? 12} mois`} />
              <InfoItem label="Contribution client" value={money(simulation.studentContribution, simulation.targetCurrency)} />
              <InfoItem label="AVI financée" value={money(simulation.financedAmount, simulation.targetCurrency)} />
              <InfoItem label="Frais nets" value={money(simulation.netFees, simulation.targetCurrency)} />
              <InfoItem label="Cash due" value={money(simulation.cashDueAtSignature, simulation.targetCurrency)} />
              <InfoItem label="Mensualité" value={money(simulation.monthlyRepayment, simulation.targetCurrency)} />
              <InfoItem label="Fee load" value={percent(simulation.feeLoadOnTargetAmount)} />
              <InfoItem label="Risk tier" value={riskTierLabel(simulation.financedShare)} />
            </dl>
          </WorkspaceSection>

          <WorkspaceSection title="Conditions commerciales éditables">
            <div className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium">Titre du devis<Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Valide jusqu'au<Input type="date" value={draft.validUntil} onChange={(event) => setDraft({ ...draft, validUntil: event.target.value })} /></label>
                <label className="grid gap-1 text-sm font-medium">Échéance paiement<Input type="date" value={draft.paymentDeadline} onChange={(event) => setDraft({ ...draft, paymentDeadline: event.target.value })} /></label>
              </div>
              <TextAreaField label="Note commerciale" value={draft.commercialNote} onChange={(value) => setDraft({ ...draft, commercialNote: value })} />
              <TextAreaField label="Note interne admin" value={draft.internalNote} onChange={(value) => setDraft({ ...draft, internalNote: value })} />
              <TextAreaField label="Conditions générales / commerciales" value={draft.termsAndConditions} onChange={(value) => setDraft({ ...draft, termsAndConditions: value })} />
              <TextAreaField label="Documents requis avant validation finale" value={draft.requiredDocumentsBeforeApproval} onChange={(value) => setDraft({ ...draft, requiredDocumentsBeforeApproval: value })} hint="Un document par ligne." />
              <TextAreaField label="Disclaimer non contraignant" value={draft.disclaimer} onChange={(value) => setDraft({ ...draft, disclaimer: value })} />
              <TextAreaField label="Recommandation commerciale" value={draft.recommendationSummary} onChange={(value) => setDraft({ ...draft, recommendationSummary: value })} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={isBusy} onClick={() => onSave(quotePatchFromDraft(draft))}>
                  <PencilLine className="h-4 w-4" />
                  Enregistrer les conditions
                </Button>
                <Button type="button" variant="outline" disabled={isBusy} onClick={onExpire}>Marquer expiré</Button>
              </div>
            </div>
          </WorkspaceSection>
        </div>

        <div className="space-y-5">
          <WorkspaceSection title="Statuts">
            <div className="grid gap-3">
              <InfoBadge label="Quote status" status={quote.status} />
              <InfoBadge label="PDF status" status={pdfStatus} hint={deliveryStatusHint(pdfStatus)} />
              <InfoBadge label="Delivery status" status={delivery} hint={deliveryStatusHint(delivery)} />
              <InfoItem label="Généré le" value={formatDate(quote.generatedAt, "Non généré")} />
              <InfoItem label="Dernier envoi" value={formatDate(quote.sentAt, "Jamais envoyé")} />
              <InfoItem label="Message livraison" value={quote.deliveryMessage ?? "-"} />
            </div>
          </WorkspaceSection>

          <WorkspaceSection title="Timeline et communication log">
            <div className="space-y-3 text-sm">
              <TimelineRow label="quote_created" value={formatDate(quote.createdAt)} />
              {quote.generatedAt ? <TimelineRow label="quote_pdf_generated" value={formatDate(quote.generatedAt)} /> : null}
              {quote.lastDeliveryAttemptAt ? <TimelineRow label={delivery} value={formatDate(quote.lastDeliveryAttemptAt)} /> : null}
              {quote.lastEmailMessageId ? <TimelineRow label="Resend message" value={quote.lastEmailMessageId} /> : null}
              {quoteEvents.length ? quoteEvents.slice(0, 8).map((event) => (
                <TimelineRow key={event.id} label={event.action} value={`${formatDate(event.createdAt)} · ${JSON.stringify(event.metadata ?? {})}`} />
              )) : null}
              {!quoteEvents.length && !quote.lastDeliveryAttemptAt ? (
                <p className="rounded-md border border-dashed border-slate-300 p-3 text-slate-600">Aucune communication devis enregistrée pour l'instant.</p>
              ) : null}
            </div>
          </WorkspaceSection>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold text-slate-950 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function InfoBadge({ label, status, hint }: { label: string; status: string; hint?: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <div className="mt-2"><DeliveryBadge status={status} /></div>
      {hint ? <p className="mt-2 text-xs text-slate-600">{hint}</p> : null}
    </div>
  );
}

function TextAreaField({ label, value, hint, onChange }: { label: string; value: string; hint?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-xs text-slate-600">{value}</p>
    </div>
  );
}

function ReportsWorkspace({ report, events }: { report: ReportView | null; events: FinancialAuditEvent[] }) {
  const reportEvents = events.filter((event) => event.type === "report_generated");
  return (
    <section className="space-y-6" aria-labelledby="reports-title">
      <div>
        <h2 id="reports-title" className="text-xl font-semibold">Rapports de préfinancement</h2>
        <p className="mt-1 text-sm text-slate-600">
          Rapports internes de validation: aucun email client n'est envoyé depuis cet onglet.
        </p>
      </div>
      <ReportPanel report={report} />
      <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="reports-history">
        <div className="border-b p-5">
          <h3 id="reports-history" className="text-lg font-semibold">Historique des rapports</h3>
          <p className="mt-1 text-sm text-slate-600">
            Statut livraison: <span className="font-semibold">Rapport interne non envoyé au client</span>.
          </p>
        </div>
        {reportEvents.length ? (
          <div className="p-5 text-sm">{reportEvents.length} rapports générés en audit financier.</div>
        ) : (
          <EmptyState title="Aucun rapport généré" text="Générez un rapport depuis le simulateur ou une simulation enregistrée." />
        )}
      </section>
    </section>
  );
}

function ReportPanel({ report }: { report: ReportView | null }) {
  if (!report) {
    return <EmptyState title="Aucun rapport sélectionné" text="Générez un rapport interne depuis le cockpit de simulation." />;
  }
  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm print:shadow-none" aria-labelledby="report-title">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">AVI CERTIFY</p>
          <h2 id="report-title" className="mt-1 text-2xl font-semibold">Client prefinancing report</h2>
          <p className="mt-2 text-sm text-slate-600">Internal reference: {report.id}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DeliveryBadge status={report.deliveryStatus ?? "INTERNAL_ONLY"} />
            <span className="text-sm font-medium text-slate-700">
              {report.deliveryNote ?? "Rapport interne non envoyé au client"}
            </span>
          </div>
        </div>
        <BadgeCheck className="h-8 w-8 text-emerald-600" aria-hidden="true" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Zone" value={report.targetCountryOrZone} detail="Target country or zone" icon={Landmark} />
        <MetricCard label="Target amount" value={money(report.targetAmount, report.targetCurrency)} detail="Requested proof-of-funds target" icon={CircleDollarSign} />
        <MetricCard label="Selected option" value={report.selectedOption} detail="Contribution scenario" icon={Calculator} />
        <MetricCard label="Validation" value={report.adminValidationStatus} detail="Internal compliance status" icon={ShieldCheck} />
      </div>
      <div className="mt-6 rounded-lg border">
        <div className="border-b bg-slate-50 p-4 font-semibold">Repayment schedule</div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Repayment</th><th className="px-4 py-3">Closing principal</th></tr>
            </thead>
            <tbody>
              {report.repaymentSchedule.slice(0, 12).map((row) => (
                <tr key={row.month} className="border-t">
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3">{money(row.repayment, report.targetCurrency)}</td>
                  <td className="px-4 py-3">{money(row.closingPrincipal, report.targetCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditLog({ events }: { events: FinancialAuditEvent[] }) {
  return <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="audit-log-title"><div className="border-b p-5"><h2 id="audit-log-title" className="text-lg font-semibold">Financial audit log</h2></div>{events.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Timestamp", "Actor", "Action", "Resource", "Metadata"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-t align-top"><td className="px-4 py-3">{formatDate(event.createdAt)}</td><td className="px-4 py-3">{event.actorLabel ?? event.actor}</td><td className="px-4 py-3">{event.action}</td><td className="px-4 py-3">{event.resourceType ?? event.targetCollection}</td><td className="max-w-xs truncate px-4 py-3 font-mono text-xs">{JSON.stringify(event.metadata)}</td></tr>)}</tbody></table></div> : <EmptyState title="Aucune activité récente" text="Les actions fintech admin auditées apparaîtront ici." />}</section>;
}
