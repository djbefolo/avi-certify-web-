import type { DashboardSummary } from "@/types/dashboard";

export const mockDashboardSummary: DashboardSummary = {
  applicationStatus: "documents_pending",
  applicationStatusLabel: "Documents attendus",
  currentStep: "Preparation du dossier financier",
  completionPercent: 42,
  destinationCountry: "France",
  requestedService: "AVI et accompagnement visa",
  advisorName: "Equipe AVI CERTIFY",
  documents: [
    {
      id: "passport",
      title: "Passeport",
      description: "Page d'identite lisible, en cours de validite.",
      status: "approved",
      required: true,
    },
    {
      id: "admission",
      title: "Admission ou pre-inscription",
      description: "Document emis par l'etablissement vise.",
      status: "pending_review",
      required: true,
    },
    {
      id: "proof-funds",
      title: "Justificatifs financiers",
      description: "Elements necessaires a l'analyse du financement.",
      status: "missing",
      required: true,
    },
  ],
  payment: {
    status: "not_started",
    amountLabel: "A definir",
    description: "Le paiement sera disponible apres validation du perimetre.",
  },
  timeline: [
    {
      id: "account",
      title: "Compte cree",
      description: "Votre espace client est actif.",
      status: "completed",
      dateLabel: "Aujourd'hui",
    },
    {
      id: "qualification",
      title: "Qualification du besoin",
      description: "L'equipe confirme le service adapte a votre projet.",
      status: "completed",
      dateLabel: "Aujourd'hui",
    },
    {
      id: "documents",
      title: "Documents a fournir",
      description: "Ajoutez les pieces requises pour avancer.",
      status: "current",
    },
    {
      id: "payment",
      title: "Paiement et validation",
      description: "Paiement securise et verification finale du dossier.",
      status: "upcoming",
    },
    {
      id: "delivery",
      title: "Emission des documents",
      description: "Reception des documents et suivi de depart.",
      status: "upcoming",
    },
  ],
  nextAction: {
    title: "Completer les justificatifs financiers",
    description:
      "Preparez les pieces de financement pour permettre a l'equipe de finaliser l'analyse du dossier.",
    href: "/dossier/documents",
    ctaLabel: "Voir les documents",
  },
};
