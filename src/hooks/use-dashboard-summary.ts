"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyCertificateSummary,
  getLatestPaymentSummary,
  getUserDocumentDashboardSummary,
  getUserProfileSummary,
  REQUIRED_DOCUMENTS,
} from "@/lib/dashboard/dashboard-data.service";
import { getSelectedServiceLabel } from "@/lib/profile/student-profile";
import { buildDossierWorkflow } from "@/lib/workflow/workflow-engine";
import type { ApplicationDocument, ApplicationPayment } from "@/types/application";
import type { DashboardSummary } from "@/types/dashboard";
import { useAuth } from "@/hooks/use-auth";

type DashboardSummaryState = {
  summary: DashboardSummary;
  loading: boolean;
  errorMessage: string | null;
};

type BuildDashboardSummaryInput = {
  documents: ApplicationDocument[];
  payment: ApplicationPayment;
  profile: DashboardSummary["profile"];
  certificate: DashboardSummary["certificate"];
};

const emptyRequiredDocuments: ApplicationDocument[] = REQUIRED_DOCUMENTS.map(
  (document) => ({
    id: document.id,
    title: document.title,
    description: document.description,
    status: "missing",
    workflowStatus: "missing",
    required: true,
  }),
);

const emptyPayment: ApplicationPayment = {
  status: "not_started",
  amountLabel: "Non demarre",
  description: "Aucun paiement n'a encore ete demarre pour ce dossier.",
};

const emptyProfile: DashboardSummary["profile"] = {
  data: null,
  completionPercent: 0,
  completionState: "incomplete",
  completionSections: [],
};

export function buildDashboardSummary({
  documents,
  payment,
  profile,
  certificate,
}: BuildDashboardSummaryInput): DashboardSummary {
  const workflow = buildDossierWorkflow({ documents, payment });
  const shouldCompleteProfile = profile.completionState !== "complete";
  const profileStatusLabel = profile.data
    ? "Profil a completer"
    : "Profil a renseigner";
  const nextAction = shouldCompleteProfile
    ? {
        title: "Completer votre profil etudiant",
        description:
          "Certaines informations personnelles ou academiques sont necessaires pour securiser votre dossier et vos documents.",
        href: "/profil",
        ctaLabel: "Completer mon profil",
      }
    : workflow.nextAction;
  const timeline = shouldCompleteProfile
    ? [
        {
          id: "profile",
          title: "Profil",
          description: profile.data
            ? "Votre profil existe mais des champs restent a renseigner."
            : "Aucun profil etudiant Firestore complet n'est encore disponible.",
          status: "current" as const,
        },
        ...workflow.timeline.map((step) => ({
          ...step,
          status: "upcoming" as const,
        })),
      ]
    : workflow.timeline;

  return {
    applicationStatus: shouldCompleteProfile
      ? "account_created"
      : workflow.status,
    applicationStatusLabel: shouldCompleteProfile
      ? profileStatusLabel
      : workflow.label,
    currentStep: shouldCompleteProfile ? profileStatusLabel : workflow.currentStep,
    completionPercent: shouldCompleteProfile
      ? Math.min(workflow.completionPercent, profile.completionPercent)
      : workflow.completionPercent,
    destinationCountry: profile.data?.destinationCountry ?? "A renseigner",
    requestedService: getSelectedServiceLabel(profile.data?.selectedService ?? null),
    advisorName: "Equipe AVI CERTIFY",
    documents,
    payment,
    certificate,
    profile,
    timeline,
    nextAction,
  };
}

export function useDashboardSummary(): DashboardSummaryState {
  const { user, isEmailVerified } = useAuth();
  const [documents, setDocuments] =
    useState<ApplicationDocument[]>(emptyRequiredDocuments);
  const [payment, setPayment] = useState<ApplicationPayment>(emptyPayment);
  const [certificate, setCertificate] =
    useState<DashboardSummary["certificate"]>(emptyCertificateSummary);
  const [profile, setProfile] =
    useState<DashboardSummary["profile"]>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      if (!user || !isEmailVerified) {
        setDocuments(emptyRequiredDocuments);
        setPayment(emptyPayment);
        setCertificate(emptyCertificateSummary);
        setProfile(emptyProfile);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const [documentSummary, nextPayment, nextProfile] = await Promise.all([
          getUserDocumentDashboardSummary(user.uid),
          getLatestPaymentSummary(user.uid),
          getUserProfileSummary(user.uid),
        ]);

        if (!cancelled) {
          setDocuments(documentSummary.documents);
          setCertificate(documentSummary.certificate);
          setPayment(nextPayment);
          setProfile(
            nextProfile
              ? {
                  data: nextProfile,
                  completionPercent: nextProfile.completionPercent,
                  completionState: nextProfile.completionState,
                  completionSections: nextProfile.completionSections,
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

  const summary = useMemo<DashboardSummary>(
    () => buildDashboardSummary({ documents, payment, profile, certificate }),
    [certificate, documents, payment, profile],
  );

  return {
    summary,
    loading,
    errorMessage,
  };
}
