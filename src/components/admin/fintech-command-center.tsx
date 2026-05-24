"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Gauge,
  Landmark,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TableProperties,
  TrendingUp,
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

type AdminData = {
  products: FinancialProduct[];
  fxRates: FxRate[];
  pricingRules: PricingRule[];
  riskRules: RiskSurchargeRule[];
  simulations: FinancingSimulation[];
  quotes: FinancingQuote[];
  auditEvents: FinancialAuditEvent[];
  comparison: ComparisonResult;
  sensitivity: {
    optionA: SensitivityRow[];
    optionB: SensitivityRow[];
  };
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
};

const navItems = [
  ["Overview", "overview", Gauge],
  ["Simulations", "simulations", Calculator],
  ["Quotes", "quotes", FileText],
  ["Sensitivity", "sensitivity", TrendingUp],
  ["FX Rates", "fx", CircleDollarSign],
  ["Pricing Rules", "pricing", SlidersHorizontal],
  ["Risk Rules", "risk", ShieldCheck],
  ["Reports", "reports", ClipboardList],
  ["Audit Log", "audit", Activity],
] as const;

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  style: "percent",
});

function money(value: number | undefined, currency?: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${numberFormat.format(value)}${currency ? ` ${currency}` : ""}`;
}

function percent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return percentFormat.format(value);
}

function apiHeaders(token: string) {
  const headers: HeadersInit = {
    "content-type": "application/json",
  };

  if (token) {
    headers["x-admin-dev-token"] = token;
  }

  return headers;
}

async function readApi<T>(path: string, token: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    headers: apiHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText || "Admin API error"}`);
  }

  return (await response.json()) as T;
}

async function writeApi<T>(path: string, token: string, body: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: apiHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText || "Admin API error"}`);
  }

  return (await response.json()) as T;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
            {label}
          </p>
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

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-lg bg-white/70" />
      ))}
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

function MiniBarChart({
  title,
  rows,
  valueKey,
  currency,
}: {
  title: string;
  rows: SensitivityRow[];
  valueKey: keyof SensitivityRow;
  currency: string;
}) {
  const max = Math.max(...rows.map((row) => Number(row[valueKey]) || 0), 1);

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.slice(0, 7).map((row) => {
          const value = Number(row[valueKey]) || 0;

          return (
            <div key={`${title}-${row.targetAmount}`} className="grid grid-cols-[74px_1fr_110px] items-center gap-3 text-xs">
              <span className="text-slate-500">{money(row.targetAmount, currency)}</span>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-600"
                  style={{ width: `${Math.max((value / max) * 100, 4)}%` }}
                />
              </div>
              <span className="text-right font-semibold text-slate-800">
                {money(value, currency)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FintechCommandCenter() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [data, setData] = useState<AdminData | null>(null);
  const [active, setActive] = useState("overview");
  const [region, setRegion] = useState<FintechRegion>("canada");
  const [xafAmount, setXafAmount] = useState(8_000_000);
  const [contributionMonths, setContributionMonths] = useState(3);
  const [discountRate, setDiscountRate] = useState(0);
  const [clientName, setClientName] = useState("Client pilote AVI");
  const [clientEmail, setClientEmail] = useState("client@example.com");
  const [selectedSimulation, setSelectedSimulation] =
    useState<FinancingSimulation | null>(null);
  const [report, setReport] = useState<ReportView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(nextToken = token, nextRegion = region, nextXaf = xafAmount) {
    setIsLoading(true);
    setError(null);

    try {
      const [
        products,
        fx,
        pricing,
        risk,
        simulations,
        quotes,
        audit,
        comparison,
        sensitivity,
      ] = await Promise.all([
        readApi<{ products: FinancialProduct[] }>("/api/admin/fintech/products", nextToken),
        readApi<{ fxRates: FxRate[] }>("/api/admin/fintech/fx", nextToken),
        readApi<{ pricingRules: PricingRule[] }>("/api/admin/fintech/pricing-rules", nextToken),
        readApi<{ riskRules: RiskSurchargeRule[] }>("/api/admin/fintech/risk-rules", nextToken),
        readApi<{ simulations: FinancingSimulation[] }>("/api/admin/fintech/simulations", nextToken),
        readApi<{ quotes: FinancingQuote[] }>("/api/admin/fintech/quotes", nextToken),
        readApi<{ auditEvents: FinancialAuditEvent[] }>("/api/admin/fintech/audit-events", nextToken),
        readApi<{ comparison: ComparisonResult }>(
          `/api/admin/fintech/comparison?region=${nextRegion}&xafAmount=${nextXaf}`,
          nextToken,
        ),
        readApi<{ sensitivity: { optionA: SensitivityRow[]; optionB: SensitivityRow[] } }>(
          `/api/admin/fintech/sensitivity?region=${nextRegion}`,
          nextToken,
        ),
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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Admin data could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const savedToken = window.sessionStorage.getItem("avi_admin_api_token") ?? "";
    setToken(savedToken);
    setTokenInput(savedToken);
    void load(savedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const simulations = data?.simulations ?? [];
    const quotes = data?.quotes ?? [];
    const reports = data?.auditEvents.filter((event) => event.type === "report_generated") ?? [];
    const exposure = simulations.reduce((sum, item) => sum + item.financedAmount, 0);
    const fees = simulations.reduce((sum, item) => sum + item.netFees, 0);
    const avgFeeLoad = simulations.length
      ? simulations.reduce((sum, item) => sum + item.feeLoadOnTargetAmount, 0) /
        simulations.length
      : data?.comparison.optionA.feeLoadOnTargetAmount ?? 0;
    const canada = simulations.filter((item) => item.region === "canada").length;
    const eu = simulations.filter((item) => item.region === "eu").length;

    return {
      simulations: simulations.length,
      quotes: quotes.length,
      exposure,
      fees,
      avgFeeLoad,
      split: simulations.length ? `${canada} Canada / ${eu} UE` : "Fallback dev state",
      reports: reports.length,
      activity: data?.auditEvents.length ?? 0,
    };
  }, [data]);

  const currentCurrency = data?.comparison.targetCurrency ?? (region === "canada" ? "CAD" : "EUR");
  const optionA = data?.comparison.optionA;
  const optionB = data?.comparison.optionB;
  const selectedForQuote = selectedSimulation ?? optionA ?? null;

  async function connectToken(event: FormEvent) {
    event.preventDefault();
    window.sessionStorage.setItem("avi_admin_api_token", tokenInput);
    setToken(tokenInput);
    await load(tokenInput);
  }

  async function refresh() {
    await load(token);
  }

  async function runComparison(event?: FormEvent) {
    event?.preventDefault();
    await load(token, region, xafAmount);
    setNotice("Comparison refreshed from protected admin APIs.");
  }

  async function createSimulation(months = contributionMonths) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ simulation: FinancingSimulation }>(
        "/api/admin/fintech/simulations",
        token,
        {
          region,
          xafAmount,
          contributionMonths: months,
          discountRate,
          clientName,
          fxReference: "Admin command center",
        },
      );
      setSelectedSimulation(response.simulation);
      setNotice(`Simulation saved: ${response.simulation.id}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Simulation failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createQuote(simulation = selectedForQuote) {
    if (!simulation) {
      setError("Create a simulation before creating a quote.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ quote: FinancingQuote }>(
        "/api/admin/fintech/quotes",
        token,
        {
          clientIdentity: {
            fullName: clientName,
            email: clientEmail,
          },
          simulationInput: {
            region: simulation.region,
            xafAmount: simulation.xafEquivalent.targetAmount,
            contributionMonths,
            discountRate,
            clientName,
          },
        },
      );
      setNotice(`Quote created: ${response.quote.id}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Quote failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateReport(simulation = selectedForQuote) {
    if (!simulation) {
      setError("Create or select a simulation before generating a report.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ report: ReportView }>(
        "/api/admin/fintech/reports",
        token,
        {
          clientIdentity: {
            fullName: clientName,
            email: clientEmail,
          },
          simulationInput: {
            region: simulation.region,
            xafAmount: simulation.xafEquivalent.targetAmount,
            contributionMonths,
            discountRate,
            clientName,
          },
        },
      );
      setReport(response.report);
      setActive("reports");
      setNotice(`Report generated: ${response.report.id}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Report failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateFx(rate: FxRate) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/fx", token, {
        pair: rate.pair,
        rate: Number(rate.rate),
      }, "PATCH");
      setNotice(`FX updated: ${rate.pair}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "FX update failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updatePricing(rule: PricingRule) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/pricing-rules", token, {
        region: rule.region,
        serviceFee: rule.serviceFee,
        baseFinancingFeeRate: rule.baseFinancingFeeRate,
        transferFeeRate: rule.transferFeeRate,
        minimumTransferFee: rule.minimumTransferFee,
        discountRateOptionA: rule.discountRateOptionA,
        discountRateOptionB: rule.discountRateOptionB,
      }, "PATCH");
      setNotice(`Pricing updated: ${rule.region}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Pricing update failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateRisk(rule: RiskSurchargeRule) {
    setIsBusy(true);
    try {
      await writeApi("/api/admin/fintech/risk-rules", token, {
        region: rule.region,
        tiers: rule.tiers,
      }, "PATCH");
      setNotice(`Risk tiers updated: ${rule.region}`);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Risk update failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[hsl(222,75%,8%)] text-white xl:block">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <Landmark className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold">AVI CERTIFY</p>
                <p className="text-xs text-slate-300">Fintech command</p>
              </div>
            </div>
            <nav className="mt-8 space-y-1" aria-label="Admin fintech navigation">
              {navItems.map(([label, key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    active === key
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
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
                  Private admin - no money movement
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  AVI CERTIFY fintech command center
                </h1>
              </div>
              <form onSubmit={connectToken} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                  aria-label="Admin API token"
                  placeholder="Dev admin API token"
                  type="password"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  className="bg-slate-50"
                />
                <Button type="submit" variant="outline">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  Connect
                </Button>
                <Button type="button" variant="ghost" onClick={refresh}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </Button>
              </form>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 lg:hidden">
              {navItems.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-sm ${
                    active === key ? "border-slate-950 bg-slate-950 text-white" : "bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="px-4 py-6 lg:px-8">
            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  API status: {data ? "connected" : "needs admin auth"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Environment: {process.env.NODE_ENV}
                </span>
                <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-800">
                  PDF export: print-ready layout
                </span>
              </div>
              {notice ? (
                <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {notice}
                </p>
              ) : null}
            </div>

            {error ? (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">Admin API unavailable or unauthorized.</p>
                <p className="mt-1">
                  {error}. In local development, enter the dev admin token. In production,
                  use a Firebase admin session.
                </p>
              </div>
            ) : null}

            {isLoading ? <LoadingState /> : null}

            {!isLoading && !data ? (
              <EmptyState
                title="Protected admin data is not loaded"
                text="The command center never reads Firestore directly. Connect through the protected admin API."
              />
            ) : null}

            {!isLoading && data ? (
              <div className="space-y-6">
                {active === "overview" ? (
                  <section className="space-y-6" aria-labelledby="overview-title">
                    <div>
                      <h2 id="overview-title" className="text-xl font-semibold">
                        Executive overview
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Operational indicators computed from protected admin API data.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Total simulations" value={String(metrics.simulations)} detail="Saved financing scenarios" icon={Calculator} />
                      <MetricCard label="Total quotes" value={String(metrics.quotes)} detail="Formal internal quote objects" icon={FileText} />
                      <MetricCard label="Financed exposure" value={money(metrics.exposure, currentCurrency)} detail="Sum of saved financed amounts" icon={Landmark} />
                      <MetricCard label="Expected fees" value={money(metrics.fees, currentCurrency)} detail="Net fees across saved simulations" icon={BarChart3} />
                      <MetricCard label="Average fee load" value={percent(metrics.avgFeeLoad)} detail="Net fees divided by target amount" icon={Gauge} />
                      <MetricCard label="Canada vs UE split" value={metrics.split} detail="Region mix in saved simulations" icon={TableProperties} />
                      <MetricCard label="Pending reports" value={String(metrics.reports)} detail="Generated reports awaiting validation" icon={ClipboardList} />
                      <MetricCard label="Recent activity" value={String(metrics.activity)} detail="Financial audit events" icon={Activity} />
                    </div>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <MiniBarChart title="Cash due sensitivity" rows={data.sensitivity.optionA} valueKey="cashDueAtSignature" currency={currentCurrency} />
                      <MiniBarChart title="Monthly repayment" rows={data.sensitivity.optionA} valueKey="monthlyRepayment" currency={currentCurrency} />
                      <MiniBarChart title="Financed exposure" rows={data.sensitivity.optionB} valueKey="financedAmount" currency={currentCurrency} />
                    </div>
                  </section>
                ) : null}

                {active === "simulations" ? (
                  <section className="space-y-6" aria-labelledby="simulation-title">
                    <div className="rounded-lg border bg-white p-5 shadow-sm">
                      <h2 id="simulation-title" className="text-xl font-semibold">
                        Simulation cockpit
                      </h2>
                      <form onSubmit={runComparison} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
                        <label className="grid gap-1 text-sm font-medium">
                          Region
                          <Select value={region} onChange={(event) => setRegion(event.target.value as FintechRegion)}>
                            <option value="canada">Canada CAD/XAF</option>
                            <option value="eu">UE EUR/XAF</option>
                          </Select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                          XAF amount
                          <Input type="number" value={xafAmount} onChange={(event) => setXafAmount(Number(event.target.value))} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                          Contribution months
                          <Select value={String(contributionMonths)} onChange={(event) => setContributionMonths(Number(event.target.value))}>
                            <option value="3">Option A - 3 months</option>
                            <option value="0">Option B - 0 month</option>
                          </Select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                          Discount
                          <Input type="number" step="0.01" value={discountRate} onChange={(event) => setDiscountRate(Number(event.target.value))} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                          Client
                          <Input value={clientName} onChange={(event) => setClientName(event.target.value)} />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                          Client email
                          <Input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} />
                        </label>
                        <div className="flex items-end">
                          <Button type="submit" className="w-full">
                            Compare
                          </Button>
                        </div>
                      </form>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {[optionA, optionB].map((simulation, index) =>
                        simulation ? (
                          <div key={simulation.option} className="rounded-lg border bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase text-emerald-700">
                                  {index === 0 ? "Option A - 3 months" : "Option B - 0 month"}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold">
                                  {simulation.region === "canada" ? "Canada" : "UE"} {simulation.targetCurrency}
                                </h3>
                              </div>
                              <Button type="button" size="sm" variant="outline" onClick={() => setSelectedSimulation(simulation)}>
                                View
                              </Button>
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
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md bg-slate-50 p-3">
                                  <dt className="text-xs text-slate-500">{label}</dt>
                                  <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ) : null,
                      )}
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                      <p className="font-semibold text-emerald-950">Recommendation summary</p>
                      <p className="mt-2 text-sm text-emerald-900">
                        Option A lowers monthly repayment by {money(data.comparison.deltaOptionBMinusA.monthlyRepayment, currentCurrency)} versus Option B. Canada delta is recalculated from scenario outputs to preserve the audited correction.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button disabled={isBusy} onClick={() => createSimulation(contributionMonths)}>
                          Save simulation
                        </Button>
                        <Button disabled={isBusy} variant="outline" onClick={() => createQuote()}>
                          Create quote
                        </Button>
                        <Button disabled={isBusy} variant="outline" onClick={() => generateReport()}>
                          Generate report
                        </Button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {active === "sensitivity" ? (
                  <section className="grid gap-4 xl:grid-cols-2">
                    <MiniBarChart title="Option A cash due" rows={data.sensitivity.optionA} valueKey="cashDueAtSignature" currency={currentCurrency} />
                    <MiniBarChart title="Option B cash due" rows={data.sensitivity.optionB} valueKey="cashDueAtSignature" currency={currentCurrency} />
                    <MiniBarChart title="Option A fee load proxy" rows={data.sensitivity.optionA} valueKey="netFees" currency={currentCurrency} />
                    <MiniBarChart title="Option B monthly repayment" rows={data.sensitivity.optionB} valueKey="monthlyRepayment" currency={currentCurrency} />
                  </section>
                ) : null}

                {active === "simulations" || active === "quotes" ? (
                  <HistoryTables
                    simulations={data.simulations}
                    quotes={data.quotes}
                    active={active}
                    onQuote={(simulation) => void createQuote(simulation)}
                    onReport={(simulation) => void generateReport(simulation)}
                  />
                ) : null}

                {active === "fx" ? (
                  <ManagementPanel title="FX rates">
                    <div className="grid gap-3">
                      {data.fxRates.map((rate) => (
                        <div key={rate.id} className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_160px_160px_auto] md:items-center">
                          <div>
                            <p className="font-semibold">{rate.pair}</p>
                            <p className="text-sm text-slate-600">{rate.source} - {new Date(rate.validAt).toLocaleDateString("fr-FR")}</p>
                          </div>
                          <Input type="number" step="0.0001" defaultValue={rate.rate} onChange={(event) => { rate.rate = Number(event.target.value); }} />
                          <span className="text-sm text-slate-600">{rate.sourceMetadata}</span>
                          <Button disabled={isBusy} onClick={() => updateFx(rate)}>Update</Button>
                        </div>
                      ))}
                    </div>
                  </ManagementPanel>
                ) : null}

                {active === "pricing" ? (
                  <ManagementPanel title="Pricing rules">
                    <div className="grid gap-4 xl:grid-cols-2">
                      {data.pricingRules.map((rule) => (
                        <div key={rule.id} className="rounded-lg border bg-white p-5 shadow-sm">
                          <h3 className="font-semibold">{rule.region.toUpperCase()} pricing</h3>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <NumberField label="Service fee" value={rule.serviceFee} onChange={(value) => { rule.serviceFee = value; }} />
                            <NumberField label="Base financing fee" value={rule.baseFinancingFeeRate} step="0.0001" onChange={(value) => { rule.baseFinancingFeeRate = value; }} />
                            <NumberField label="Transfer fee" value={rule.transferFeeRate} step="0.0001" onChange={(value) => { rule.transferFeeRate = value; }} />
                            <NumberField label="Minimum transfer" value={rule.minimumTransferFee} onChange={(value) => { rule.minimumTransferFee = value; }} />
                            <NumberField label="Discount A" value={rule.discountRateOptionA} step="0.01" onChange={(value) => { rule.discountRateOptionA = value; }} />
                            <NumberField label="Discount B" value={rule.discountRateOptionB} step="0.01" onChange={(value) => { rule.discountRateOptionB = value; }} />
                          </div>
                          <p className="mt-4 text-sm text-slate-600">{rule.feePolicy}</p>
                          <Button className="mt-4" disabled={isBusy} onClick={() => updatePricing(rule)}>Update pricing</Button>
                        </div>
                      ))}
                    </div>
                  </ManagementPanel>
                ) : null}

                {active === "risk" ? (
                  <ManagementPanel title="Risk surcharge tiers">
                    <div className="grid gap-4 xl:grid-cols-2">
                      {data.riskRules.map((rule) => (
                        <div key={rule.id} className="rounded-lg border bg-white p-5 shadow-sm">
                          <h3 className="font-semibold">{rule.region.toUpperCase()} risk tiers</h3>
                          <div className="mt-4 space-y-3">
                            {rule.tiers.map((tier, index) => (
                              <div key={tier.label} className="grid gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-3">
                                <Input aria-label="Tier label" defaultValue={tier.label} onChange={(event) => { tier.label = event.target.value; }} />
                                <Input aria-label="Max financed share" type="number" step="0.01" defaultValue={tier.maxFinancedShare} onChange={(event) => { rule.tiers[index].maxFinancedShare = Number(event.target.value); }} />
                                <Input aria-label="Surcharge rate" type="number" step="0.001" defaultValue={tier.surchargeRate} onChange={(event) => { rule.tiers[index].surchargeRate = Number(event.target.value); }} />
                              </div>
                            ))}
                          </div>
                          <Button className="mt-4" disabled={isBusy} onClick={() => updateRisk(rule)}>Update risk tiers</Button>
                        </div>
                      ))}
                    </div>
                  </ManagementPanel>
                ) : null}

                {active === "reports" ? (
                  <ReportPanel report={report} />
                ) : null}

                {active === "audit" ? (
                  <AuditLog events={data.auditEvents} />
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <Input
        type="number"
        step={step}
        defaultValue={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ManagementPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4" aria-labelledby={`${title}-title`}>
      <div>
        <h2 id={`${title}-title`} className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Updates are routed through protected admin APIs and recorded in the financial audit log.
        </p>
      </div>
      {children}
    </section>
  );
}

function HistoryTables({
  simulations,
  quotes,
  active,
  onQuote,
  onReport,
}: {
  simulations: FinancingSimulation[];
  quotes: FinancingQuote[];
  active: string;
  onQuote: (simulation: FinancingSimulation) => void;
  onReport: (simulation: FinancingSimulation) => void;
}) {
  if (active === "simulations") {
    return (
      <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="simulations-history">
        <div className="border-b p-5">
          <h2 id="simulations-history" className="text-lg font-semibold">Simulations history</h2>
        </div>
        {simulations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Date", "Region", "XAF", "Option", "Financed", "Cash due", "Monthly", "Fee load", "Actions"].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simulations.map((simulation) => (
                  <tr key={simulation.id} className="border-t">
                    <td className="px-4 py-3">{new Date(simulation.createdAt).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3">{simulation.region}</td>
                    <td className="px-4 py-3">{money(simulation.xafEquivalent.targetAmount, "XAF")}</td>
                    <td className="px-4 py-3">{simulation.option}</td>
                    <td className="px-4 py-3">{money(simulation.financedAmount, simulation.targetCurrency)}</td>
                    <td className="px-4 py-3">{money(simulation.cashDueAtSignature, simulation.targetCurrency)}</td>
                    <td className="px-4 py-3">{money(simulation.monthlyRepayment, simulation.targetCurrency)}</td>
                    <td className="px-4 py-3">{percent(simulation.feeLoadOnTargetAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onQuote(simulation)}>Quote</Button>
                        <Button size="sm" variant="ghost" onClick={() => onReport(simulation)}>Report</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No simulations yet" text="Save a simulation from the cockpit to populate this history." />
        )}
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="quotes-history">
      <div className="border-b p-5">
        <h2 id="quotes-history" className="text-lg font-semibold">Quotes management</h2>
      </div>
      {quotes.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Date", "Quote ID", "Client", "Region", "Option", "Cash due", "Monthly", "Total effort", "Status"].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr key={quote.id} className="border-t">
                  <td className="px-4 py-3">{new Date(quote.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{quote.id}</td>
                  <td className="px-4 py-3">{quote.clientIdentity.fullName ?? quote.clientIdentity.email ?? "-"}</td>
                  <td className="px-4 py-3">{quote.simulationSnapshot.region}</td>
                  <td className="px-4 py-3">{quote.simulationSnapshot.option}</td>
                  <td className="px-4 py-3">{money(quote.simulationSnapshot.cashDueAtSignature, quote.simulationSnapshot.targetCurrency)}</td>
                  <td className="px-4 py-3">{money(quote.simulationSnapshot.monthlyRepayment, quote.simulationSnapshot.targetCurrency)}</td>
                  <td className="px-4 py-3">{money(quote.simulationSnapshot.totalClientEffort, quote.simulationSnapshot.targetCurrency)}</td>
                  <td className="px-4 py-3">{quote.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No quotes yet" text="Create a quote from a saved simulation." />
      )}
    </section>
  );
}

function ReportPanel({ report }: { report: ReportView | null }) {
  if (!report) {
    return (
      <EmptyState
        title="No report selected"
        text="Generate a client prefinancing report from the simulation cockpit."
      />
    );
  }

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm print:shadow-none" aria-labelledby="report-title">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-emerald-700">AVI CERTIFY</p>
          <h2 id="report-title" className="mt-1 text-2xl font-semibold">Client prefinancing report</h2>
          <p className="mt-2 text-sm text-slate-600">Internal reference: {report.id}</p>
        </div>
        <BadgeCheck className="h-8 w-8 text-emerald-600" aria-hidden="true" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Zone" value={report.targetCountryOrZone} detail="Target country or zone" icon={Landmark} />
        <MetricCard label="Target amount" value={money(report.targetAmount, report.targetCurrency)} detail="Requested proof-of-funds target" icon={CircleDollarSign} />
        <MetricCard label="Selected option" value={report.selectedOption} detail="Contribution scenario" icon={Calculator} />
        <MetricCard label="Validation" value={report.adminValidationStatus} detail="Internal compliance status" icon={ShieldCheck} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-5">
          <h3 className="font-semibold">Fee breakdown</h3>
          <dl className="mt-4 space-y-2 text-sm">
            {Object.entries(report.feesBreakdown).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold">{money(value, report.targetCurrency)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-lg bg-slate-50 p-5">
          <h3 className="font-semibold">Compliance notes</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {report.complianceNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 rounded-lg border">
        <div className="border-b bg-slate-50 p-4 font-semibold">Repayment schedule</div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Repayment</th>
                <th className="px-4 py-3">Closing principal</th>
              </tr>
            </thead>
            <tbody>
              {report.repaymentSchedule.map((row) => (
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
  const [filter, setFilter] = useState("");
  const filtered = events.filter((event) =>
    `${event.action} ${event.actorLabel ?? event.actor} ${event.resourceType}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );

  return (
    <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="audit-title">
      <div className="grid gap-3 border-b p-5 md:grid-cols-[1fr_280px] md:items-center">
        <div>
          <h2 id="audit-title" className="text-lg font-semibold">Financial audit log</h2>
          <p className="mt-1 text-sm text-slate-600">Admin access and sensitive financial actions.</p>
        </div>
        <Input placeholder="Filter audit events" value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      {filtered.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Timestamp", "Actor", "Action", "Resource", "IP", "User agent", "Metadata"].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id} className="border-t align-top">
                  <td className="px-4 py-3">{new Date(event.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">{event.actorLabel ?? event.actor}</td>
                  <td className="px-4 py-3">{event.action}</td>
                  <td className="px-4 py-3">{event.resourceType}{event.resourceId ? ` / ${event.resourceId}` : ""}</td>
                  <td className="px-4 py-3">{event.ip ?? "-"}</td>
                  <td className="max-w-xs truncate px-4 py-3">{event.userAgent ?? "-"}</td>
                  <td className="max-w-sm truncate px-4 py-3 font-mono text-xs">{JSON.stringify(event.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No matching audit events" text="Try another filter or perform an admin action." />
      )}
    </section>
  );
}
