import { ReceiptText } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { PaymentButton } from "@/components/payments/payment-button";
import { mockDashboardSummary } from "@/constants/dashboard";

export default function PaiementPage() {
  const summary = mockDashboardSummary;

  return (
    <DashboardLayout
      title="Paiement"
      description="Visualisez l'etat du paiement. L'integration Stripe sera ajoutee quand le parcours financier sera valide."
    >
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
                  Le statut sera confirme automatiquement via webhook Stripe
                  dans une prochaine etape. Pour l'instant, la session Checkout
                  est creee et rattachee a votre compte.
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
