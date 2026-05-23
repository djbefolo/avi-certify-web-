import {
  BarChart3,
  Calculator,
  FileText,
  Landmark,
  ShieldCheck,
  TableProperties,
} from "lucide-react";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";

export default function AdminFintechPage() {
  const service = new FinancingSimulationService();
  const canada = service.compare("canada", 8_000_000);
  const eu = service.compare("eu", 8_000_000);
  const cards = [
    ["Total simulations", "0", Calculator],
    ["Quotes generated", "0", FileText],
    [
      "Total financed exposure",
      `${Math.round(canada.optionA.financedAmount + eu.optionA.financedAmount).toLocaleString("fr-FR")}`,
      Landmark,
    ],
    [
      "Expected fees",
      `${Math.round(canada.optionA.netFees + eu.optionA.netFees).toLocaleString("fr-FR")}`,
      BarChart3,
    ],
    ["Canada vs EU split", "50 / 50", TableProperties],
    ["Pending compliance items", "À valider", ShieldCheck],
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="border-b bg-[hsl(222,75%,8%)] text-white">
        <div className="container py-10">
          <p className="text-sm font-semibold uppercase tracking-normal text-[hsl(var(--institutional-yellow))]">
            Admin fintech core
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            AVI CERTIFY financial cockpit
          </h1>
          <p className="mt-3 max-w-3xl text-slate-200">
            Backoffice privé pour simulations, devis, FX, pricing rules, risk tiers, sensibilité et rapports préfinancement. Aucun mouvement d’argent, transfert ou crédit n’est exécuté ici.
          </p>
        </div>
      </section>

      <section className="container py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(([label, value, Icon]) => (
            <div key={label as string} className="rounded-lg border bg-background p-5 shadow-sm">
              <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <p className="mt-4 text-sm text-muted-foreground">{label as string}</p>
              <p className="mt-1 text-2xl font-semibold">{value as string}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {[
            ["Canada CAD/XAF", canada],
            ["UE EUR/XAF", eu],
          ].map(([label, comparison]) => {
            const data = comparison as typeof canada;

            return (
              <div key={label as string} className="rounded-lg border bg-background p-6 shadow-sm">
                <h2 className="text-xl font-semibold">{label as string}</h2>
                <div className="mt-5 grid gap-3 text-sm">
                  <p>Option A cash signature: {Math.round(data.optionA.cashDueAtSignature).toLocaleString("fr-FR")} {data.targetCurrency}</p>
                  <p>Option B cash signature: {Math.round(data.optionB.cashDueAtSignature).toLocaleString("fr-FR")} {data.targetCurrency}</p>
                  <p>Delta mensualité: {Math.round(data.deltaOptionBMinusA.monthlyRepayment).toLocaleString("fr-FR")} {data.targetCurrency}</p>
                  <p>Fee load A: {(data.optionA.feeLoadOnTargetAmount * 100).toFixed(2)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
