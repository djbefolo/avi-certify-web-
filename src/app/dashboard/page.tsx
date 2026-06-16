"use client";

import { ApplicationTimeline } from "@/components/dashboard/application-timeline";
import { ClientQuotesList } from "@/components/dashboard/client-quotes-list";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { DocumentStatusCard } from "@/components/dashboard/document-status-card";
import { DossierStatusCard } from "@/components/dashboard/dossier-status-card";
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { ProfileStatusCard } from "@/components/dashboard/profile-status-card";
import { StudentSummaryCard } from "@/components/dashboard/student-summary-card";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import type { DashboardSummary as DashboardSummaryType } from "@/types/dashboard";

function EmptyDossierStatusCard() {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Etat du dossier</p>
        <h2 className="mt-2 text-xl font-semibold">Profil a renseigner</h2>
      </div>
      <p className="mt-4 leading-7 text-muted-foreground">
        Aucun profil etudiant complet n'est encore disponible. Le dossier client
        sera synchronise avec les documents, paiements et devis des que les
        donnees Firestore existent.
      </p>
    </article>
  );
}

function CertificateStatusCard({
  certificate,
}: {
  certificate: DashboardSummaryType["certificate"];
}) {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Attestation</p>
        <h2 className="mt-2 text-xl font-semibold">
          {certificate.available ? certificate.title : "A completer"}
        </h2>
      </div>
      <p className="mt-4 leading-7 text-muted-foreground">
        {certificate.description}
      </p>
      {certificate.certificateNumber ? (
        <p className="mt-3 text-sm font-semibold">
          No. {certificate.certificateNumber}
        </p>
      ) : null}
      {certificate.verificationUrl ? (
        <a
          className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline"
          href={certificate.verificationUrl}
          rel="noreferrer"
          target="_blank"
        >
          Verifier l'authenticite
        </a>
      ) : null}
    </article>
  );
}

export default function DashboardPage() {
  const { summary, loading, errorMessage } = useDashboardSummary();

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
        <StudentSummaryCard profile={summary.profile.data} />

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-5">
            {summary.profile.data ? (
              <DossierStatusCard
                status={summary.applicationStatus}
                currentStep={summary.currentStep}
                completionPercent={summary.completionPercent}
                advisorName={summary.advisorName}
              />
            ) : (
              <EmptyDossierStatusCard />
            )}
            <ProfileStatusCard profile={summary.profile} />
            <DocumentStatusCard documents={summary.documents} />
            <ClientQuotesList />
          </div>
          <div className="grid gap-5">
            <NextActionCard action={summary.nextAction} />
            <PaymentStatusCard payment={summary.payment} />
            <CertificateStatusCard certificate={summary.certificate} />
            <ApplicationTimeline steps={summary.timeline} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
