import { ApplicationTimeline } from "@/components/dashboard/application-timeline";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DossierStatusCard } from "@/components/dashboard/dossier-status-card";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { mockDashboardSummary } from "@/constants/dashboard";

export default function DossierPage() {
  const summary = mockDashboardSummary;

  return (
    <DashboardLayout
      title="Dossier"
      description="Consultez l'etat global de votre accompagnement, l'etape actuelle et les actions attendues."
    >
      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-5">
          <DossierStatusCard
            status={summary.applicationStatus}
            currentStep={summary.currentStep}
            completionPercent={summary.completionPercent}
            advisorName={summary.advisorName}
          />
          <NextActionCard action={summary.nextAction} />
        </div>
        <ApplicationTimeline steps={summary.timeline} />
      </div>
    </DashboardLayout>
  );
}
