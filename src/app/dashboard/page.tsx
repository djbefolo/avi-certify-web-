import { ApplicationTimeline } from "@/components/dashboard/application-timeline";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { DocumentStatusCard } from "@/components/dashboard/document-status-card";
import { DossierStatusCard } from "@/components/dashboard/dossier-status-card";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { mockDashboardSummary } from "@/constants/dashboard";

export default function DashboardPage() {
  const summary = mockDashboardSummary;

  return (
    <DashboardLayout
      title="Vue globale"
      description="Suivez les priorites de votre dossier AVI CERTIFY depuis un espace client clair et securise."
    >
      <div className="grid gap-5">
        <DashboardSummary summary={summary} />

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            <DossierStatusCard
              status={summary.applicationStatus}
              currentStep={summary.currentStep}
              completionPercent={summary.completionPercent}
              advisorName={summary.advisorName}
            />
            <DocumentStatusCard documents={summary.documents} />
          </div>
          <div className="grid gap-5">
            <NextActionCard action={summary.nextAction} />
            <PaymentStatusCard payment={summary.payment} />
            <ApplicationTimeline steps={summary.timeline} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
