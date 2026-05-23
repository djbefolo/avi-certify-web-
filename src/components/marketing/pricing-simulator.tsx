"use client";

import { useMemo, useState } from "react";
import { Calculator, Landmark, RefreshCw } from "lucide-react";

type DestinationKey = "europe" | "canada";

type PricingRule = {
  label: string;
  shortLabel: string;
  currency: "EUR" | "CAD";
  minimumAviAmount: number;
  defaultAviAmount: number;
  maximumSliderAmount: number;
  serviceFee: number;
  managementFeeRate: number;
  schoolTransferFeeRate: number;
  exchangeRateToXaf: number;
  exchangeLabel: string;
  exchangeNote: string;
  baseIndicativeRate?: number;
  safetyMarginRate?: number;
};

const fixedEurToXafRate = 655.957;
const baseIndicativeCadToXafRate = 450;
const cadSafetyMarginRate = 0.06;
const effectiveCadToXafRate =
  baseIndicativeCadToXafRate * (1 + cadSafetyMarginRate);

// Later this can be replaced by Firestore-admin editable pricing rules.
export const pricingRules: Record<DestinationKey, PricingRule> = {
  europe: {
    label: "Europe / France 🇫🇷 / 🇪🇺",
    shortLabel: "Europe",
    currency: "EUR",
    minimumAviAmount: 7380,
    defaultAviAmount: 7380,
    maximumSliderAmount: 15000,
    serviceFee: 460,
    managementFeeRate: 0.035,
    schoolTransferFeeRate: 0.05,
    exchangeRateToXaf: fixedEurToXafRate,
    exchangeLabel: "EUR → XAF",
    exchangeNote: "Parité fixe EUR → XAF : 1 € = 655,957 FCFA",
  },
  canada: {
    label: "Canada 🇨🇦",
    shortLabel: "Canada",
    currency: "CAD",
    minimumAviAmount: 15000,
    defaultAviAmount: 15000,
    maximumSliderAmount: 30000,
    // This can later be indexed dynamically from 460 EUR converted to CAD using live EUR/CAD rate + margin.
    serviceFee: 750,
    managementFeeRate: 0.035,
    schoolTransferFeeRate: 0.05,
    exchangeRateToXaf: effectiveCadToXafRate,
    exchangeLabel: "CAD → XAF",
    exchangeNote: "Taux indicatif — à actualiser lors du traitement du dossier.",
    baseIndicativeRate: baseIndicativeCadToXafRate,
    safetyMarginRate: cadSafetyMarginRate,
  },
};

function formatMoney(amount: number, currency: PricingRule["currency"]) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatXaf(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(rate: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(rate);
}

export function PricingFormula() {
  const [aviAmount, setAviAmount] = useState(pricingRules.europe.defaultAviAmount);
  const rule = pricingRules.europe;
  const managementFee = aviAmount * rule.managementFeeRate;
  const total = aviAmount + rule.serviceFee + managementFee;

  const formulaItems = [
    { label: "Montant choisi", value: formatMoney(aviAmount, rule.currency) },
    { label: "Frais de service", value: formatMoney(rule.serviceFee, rule.currency) },
    {
      label: `Frais de gestion ${formatPercent(rule.managementFeeRate)}`,
      value: formatMoney(managementFee, rule.currency),
    },
    { label: "Total indicatif", value: formatMoney(total, rule.currency), result: true },
  ];

  const setFormulaAmount = (value: number) => {
    const safeValue = Number.isFinite(value)
      ? Math.max(0, value)
      : rule.defaultAviAmount;

    setAviAmount(safeValue);
  };

  return (
    <section className="border-b bg-muted/30">
      <div className="container py-14 md:py-20">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-accent">
              Lecture transparente
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Une formule lisible avant engagement
            </h2>
          </div>
          <label className="grid gap-2 text-sm font-medium text-muted-foreground lg:w-56">
            Montant AVI
            <input
              type="number"
              min={0}
              step={10}
              value={aviAmount}
              onChange={(event) => setFormulaAmount(Number(event.target.value))}
              className="h-11 rounded-md border bg-background px-3 text-base font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.15fr]">
          {formulaItems.map((item, index) => (
            <div key={item.label} className="contents">
              <div
                className={`rounded-lg border p-6 shadow-sm ${
                  item.result
                    ? "border-accent/30 bg-primary text-white"
                    : "bg-background"
                }`}
              >
                <p
                  className={`text-sm font-semibold uppercase tracking-normal ${
                    item.result
                      ? "text-[hsl(var(--institutional-yellow))]"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                </p>
                <p className="mt-4 text-3xl font-semibold">{item.value}</p>
              </div>
              {index < formulaItems.length - 1 ? (
                <div className="hidden items-center text-3xl font-semibold text-accent lg:flex">
                  {index === formulaItems.length - 2 ? "=" : "+"}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSimulator() {
  const [destination, setDestination] = useState<DestinationKey>("europe");
  const [amounts, setAmounts] = useState<Record<DestinationKey, number>>({
    europe: pricingRules.europe.defaultAviAmount,
    canada: pricingRules.canada.defaultAviAmount,
  });

  const rule = pricingRules[destination];
  const aviAmount = amounts[destination];

  const simulation = useMemo(() => {
    const managementFee = aviAmount * rule.managementFeeRate;
    const total = aviAmount + rule.serviceFee + managementFee;
    const xafEquivalent = total * rule.exchangeRateToXaf;

    return {
      managementFee,
      total,
      xafEquivalent,
      schoolTransferRate: formatPercent(rule.schoolTransferFeeRate),
    };
  }, [aviAmount, rule]);

  const setAmount = (value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : rule.minimumAviAmount;
    setAmounts((current) => ({ ...current, [destination]: safeValue }));
  };

  const sliderMax = Math.max(rule.maximumSliderAmount, aviAmount);

  return (
    <section className="relative overflow-hidden border-y bg-[hsl(222,75%,8%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(5,150,105,0.2),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(249,200,70,0.12),transparent_28%)]" />
      <div className="container relative py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--institutional-yellow))]/30 bg-[hsl(var(--institutional-yellow))]/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--institutional-yellow))]">
              <Calculator className="h-4 w-4" aria-hidden="true" />
              Simulation indicative
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Simulez votre budget de mobilité
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-200">
              Estimez le total à prévoir selon votre destination, le montant AVI souhaité, les frais de service AVI CERTIFY et les frais de gestion.
            </p>

            <div className="mt-8 grid gap-3">
              {(Object.keys(pricingRules) as DestinationKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDestination(key)}
                  className={`flex items-center justify-between rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--institutional-yellow))] ${
                    destination === key
                      ? "border-accent bg-accent/20 text-white"
                      : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <span className="font-semibold">{pricingRules[key].label}</span>
                  <span className="text-sm">{pricingRules[key].currency}</span>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-white/15 bg-white/[0.07] p-5">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-accent-light" aria-hidden="true" />
                <div>
                  <p className="font-semibold">
                    {destination === "europe"
                      ? "Parité fixe"
                      : "Taux indicatif devise"}
                  </p>
                  {destination === "europe" ? (
                    <p className="mt-1 text-sm text-slate-300">
                      {rule.exchangeNote}
                    </p>
                  ) : (
                    <div className="mt-1 grid gap-1 text-sm text-slate-300">
                      <p>
                        Taux indicatif CAD → XAF :{" "}
                        {rule.baseIndicativeRate?.toLocaleString("fr-FR")} FCFA
                      </p>
                      <p>
                        Marge de sécurité AVI CERTIFY :{" "}
                        {formatPercent(rule.safetyMarginRate ?? 0)}
                      </p>
                      <p>
                        Taux appliqué estimatif :{" "}
                        {rule.exchangeRateToXaf.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                {rule.exchangeNote}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-[hsl(var(--institutional-yellow))]">
                  Montant AVI souhaité
                </p>
                <p className="mt-2 text-4xl font-semibold">
                  {formatMoney(aviAmount, rule.currency)}
                </p>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-200">
                Saisie libre
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={aviAmount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="h-11 w-full rounded-md border border-white/15 bg-white text-slate-950 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:w-44"
                />
              </label>
            </div>

            <div className="mt-8">
              <input
                type="range"
                min={rule.minimumAviAmount}
                max={sliderMax}
                step={10}
                value={Math.min(aviAmount, sliderMax)}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-[hsl(var(--accent))]"
                aria-label="Montant AVI souhaité"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-300">
                <span>{formatMoney(rule.minimumAviAmount, rule.currency)}</span>
                <span>{formatMoney(rule.maximumSliderAmount, rule.currency)} via curseur</span>
              </div>
              <p className="mt-3 text-xs text-slate-300">
                Vous pouvez saisir manuellement un montant supérieur au plafond du curseur.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Montant AVI choisi", formatMoney(aviAmount, rule.currency)],
                [
                  "Frais de service AVI CERTIFY",
                  formatMoney(rule.serviceFee, rule.currency),
                ],
                [`Frais de gestion ${formatPercent(rule.managementFeeRate)}`, formatMoney(simulation.managementFee, rule.currency)],
                ["Total estimatif devise", formatMoney(simulation.total, rule.currency)],
                ["Équivalent FCFA indicatif", formatXaf(simulation.xafEquivalent)],
                ["Frais transfert école", simulation.schoolTransferRate],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-300">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-[hsl(var(--institutional-yellow))]/25 bg-[hsl(var(--institutional-yellow))]/10 p-4">
              <div className="flex items-start gap-3">
                <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--institutional-yellow))]" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-100">
                  Les montants affichés sont indicatifs. Les taux appliqués peuvent être confirmés au moment du traitement, notamment pour les devises volatiles comme le dollar canadien.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
