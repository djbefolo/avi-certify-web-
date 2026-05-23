"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLatestPaymentSummary,
  getRequiredDocumentSummary,
  getUserProfileSummary,
  REQUIRED_DOCUMENTS,
} from "@/lib/dashboard/dashboard-data.service";
import { buildDossierWorkflow } from "@/lib/workflow/workflow-engine";
import { getSelectedServiceLabel } from "@/lib/profile/student-profile";
import type { ApplicationDocument, ApplicationPayment } from "@/types/application";
import type { DashboardSummary } from "@/types/dashboard";
import { useAuth } from "@/hooks/use-auth";

type DashboardSummaryState = {
  summary: DashboardSummary;
  loading: boolean;
  errorMessage: string | null;
};

const emptyRequiredDocuments: ApplicationDocument[] = REQUIRED_DOCUMENTS.map(
  (document) => ({
    id: document.id,
    title: document.title,
    description: document.description,
    status: "missing",
    required: true,
  }),
);

const emptyPayment: ApplicationPayment = {
  status: "not_started",
  amountLabel: "Non démarré",
  description: "Aucun paiement n'a encore ete demarre pour ce dossier.",
};

const emptyProfile = {
  data: null,
  completionPercent: 0,
  completionState: "incomplete" as const,
};

export function useDashboardSummary(): DashboardSummaryState {
  const { user, isEmailVerified } = useAuth();
  const [documents, setDocuments] =
    useState<ApplicationDocument[]>(emptyRequiredDocuments);
  const [payment, setPayment] = useState<ApplicationPayment>(emptyPayment);
  const [profile, setProfile] = useState<DashboardSummary["profile"]>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!user || !isEmailVerified) {
        setDocuments(emptyRequiredDocuments);
        setPayment(emptyPayment);
        setProfile(emptyProfile);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const [nextDocuments, nextPayment, nextProfile] = await Promise.all([
          getRequiredDocumentSummary(user.uid),
          getLatestPaymentSummary(user.uid),
          getUserProfileSummary(user.uid),
        ]);

        if (!cancelled) {
          setDocuments(nextDocuments);
          setPayment(nextPayment);
          setProfile(
            nextProfile
              ? {
                  data: nextProfile,
                  completionPercent: nextProfile.completionPercent,
                  completionState: nextProfile.completionState,
                }
              : emptyProfile,
          );
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Impossible de charger les donnees du dossier pour le moment.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, user]);

  const summary = useMemo<DashboardSummary>(() => {
    const workflow = buildDossierWorkflow({ documents, payment });
    const shouldCompleteProfile = profile.completionState !== "complete";
    const nextAction = shouldCompleteProfile
      ? {
          title: "Compléter votre profil étudiant",
          description:
            "Certaines informations personnelles ou académiques sont nécessaires pour sécuriser votre dossier et vos documents.",
          href: "/profil",
          ctaLabel: "Compléter mon profil",
        }
      : workflow.nextAction;

    return {
      applicationStatus: workflow.status,
      applicationStatusLabel: workflow.label,
      currentStep: workflow.currentStep,
      completionPercent: workflow.completionPercent,
      destinationCountry: profile.data?.destinationCountry ?? "Non renseignée",
      requestedService: getSelectedServiceLabel(profile.data?.selectedService ?? null),
      advisorName: "Equipe AVI CERTIFY",
      documents,
      payment,
      profile,
      timeline: workflow.timeline,
      nextAction,
    };
  }, [documents, payment, profile]);

  return {
    summary,
    loading,
    errorMessage,
  };
}
