"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLatestPaymentSummary,
  getRequiredDocumentSummary,
  REQUIRED_DOCUMENTS,
} from "@/lib/dashboard/dashboard-data.service";
import { buildDossierWorkflow } from "@/lib/workflow/workflow-engine";
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

export function useDashboardSummary(): DashboardSummaryState {
  const { user, isEmailVerified } = useAuth();
  const [documents, setDocuments] =
    useState<ApplicationDocument[]>(emptyRequiredDocuments);
  const [payment, setPayment] = useState<ApplicationPayment>(emptyPayment);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!user || !isEmailVerified) {
        setDocuments(emptyRequiredDocuments);
        setPayment(emptyPayment);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const [nextDocuments, nextPayment] = await Promise.all([
          getRequiredDocumentSummary(user.uid),
          getLatestPaymentSummary(user.uid),
        ]);

        if (!cancelled) {
          setDocuments(nextDocuments);
          setPayment(nextPayment);
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

    return {
      applicationStatus: workflow.status,
      applicationStatusLabel: workflow.label,
      currentStep: workflow.currentStep,
      completionPercent: workflow.completionPercent,
      destinationCountry: "Non renseignee",
      requestedService: "Non renseigne",
      advisorName: "Equipe AVI CERTIFY",
      documents,
      payment,
      timeline: workflow.timeline,
      nextAction: workflow.nextAction,
    };
  }, [documents, payment]);

  return {
    summary,
    loading,
    errorMessage,
  };
}
