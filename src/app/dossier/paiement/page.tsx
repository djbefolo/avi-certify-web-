"use client";

import { ReceiptText } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { PaymentButton } from "@/components/payments/payment-button";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

export default function PaiementPage() {
  const { summary, loading, errorMessage } = useDashboardSummary();

  return (
    <DashboardLayout
      title="Paiement"
      description="Visualisez l'etat du dernier paiement rattache a votre dossier."
    >
      {errorMessage ? (
        <p className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {loading ? (
        <p className="mb-5 rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
          Chargement du paiement...
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5">
          <PaymentStatusCard payment={summary.payment} />

          <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <ReceiptText className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Suivi du paiement</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Le statut est lu depuis Firestore et mis a jour par le
                  webhook Stripe lorsqu'un evenement de paiement est recu.
                </p>
              </div>
            </div>
          </section>
        </div>

        <PaymentButton />
      </div>
    </DashboardLayout>
  );
}
