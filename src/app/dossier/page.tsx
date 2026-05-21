"use client";

import { ApplicationTimeline } from "@/components/dashboard/application-timeline";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DossierStatusCard } from "@/components/dashboard/dossier-status-card";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

export default function DossierPage() {
  const { summary, loading, errorMessage } = useDashboardSummary();

  return (
    <DashboardLayout
      title="Dossier"
      description="Consultez l'etat global de votre accompagnement, l'etape actuelle et les actions attendues."
    >
      {errorMessage ? (
        <p className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {loading ? (
        <p className="mb-5 rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
          Chargement des donnees du dossier...
        </p>
      ) : null}
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
