"use client";

import { useEffect, useMemo, useState } from "react";
import { ApplicationTimeline } from "@/components/dashboard/application-timeline";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { DocumentStatusCard } from "@/components/dashboard/document-status-card";
import { DossierStatusCard } from "@/components/dashboard/dossier-status-card";
import { GuideResourceCard } from "@/components/dashboard/guide-resource-card";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { ProfileStatusCard } from "@/components/dashboard/profile-status-card";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import {
  clearRememberedGuideIntent,
  getRememberedGuideIntent,
} from "@/lib/resources/guide-intent.client";
import { isGuideFrance2026Resource } from "@/lib/resources/guide-resource";

export default function DashboardPage() {
  const { summary, loading, errorMessage } = useDashboardSummary();
  const [resource, setResource] = useState<string | null>(null);
  const highlightedGuide = useMemo(
    () => isGuideFrance2026Resource(resource),
    [resource],
  );

  useEffect(() => {
    const currentResource = new URLSearchParams(window.location.search).get(
      "resource",
    );
    const rememberedResource = getRememberedGuideIntent();
    const guideResource = isGuideFrance2026Resource(currentResource)
      ? currentResource
      : rememberedResource;

    setResource(guideResource);

    if (guideResource) {
      clearRememberedGuideIntent();
    }
  }, []);

  return (
    <DashboardLayout
      title="Vue globale"
      description="Pilotez vos documents, votre paiement et les prochaines actions depuis un espace client securise."
    >
      <div className="grid gap-5">
        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {loading ? (
          <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
            Chargement de votre dossier...
          </p>
        ) : null}
        <DashboardSummary summary={summary} />
        <GuideResourceCard highlighted={highlightedGuide} />

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            <DossierStatusCard
              status={summary.applicationStatus}
              currentStep={summary.currentStep}
              completionPercent={summary.completionPercent}
              advisorName={summary.advisorName}
            />
            <ProfileStatusCard profile={summary.profile} />
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
