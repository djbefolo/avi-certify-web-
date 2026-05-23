"use client";

import { ArrowRight, GraduationCap, FileCheck2, ShieldCheck } from "lucide-react";
import { WorkflowAwareLink } from "@/components/navigation/workflow-aware-link";

const processSteps = [
  {
    title: "Créez votre dossier",
    helper: "Inscription et qualification",
    unauthHref: "/inscription",
    profileIncompleteHref: "/profil",
    authenticatedHref: "/dashboard",
  },
  {
    title: "Déposez vos informations",
    helper: "Documents et pièces justificatives",
    unauthHref: "/connexion",
    documentsMissingHref: "/dossier/documents",
    authenticatedHref: "/dashboard",
  },
  {
    title: "Payez ou planifiez votre dépôt",
    helper: "Paiement sécurisé",
    unauthHref: "/connexion",
    paymentPendingHref: "/dossier/paiement",
    authenticatedHref: "/dashboard",
  },
  {
    title: "Recevez vos documents",
    helper: "Attestations et certificats",
    unauthHref: "/connexion",
    authenticatedHref: "/dossier/documents",
  },
  {
    title: "Suivez votre départ",
    helper: "Suivi et accompagnement",
    unauthHref: "/connexion",
    authenticatedHref: "/dashboard",
  },
];

export function ProcessSteps() {
  return (
    <div className="grid gap-4">
      {processSteps.map((step, index) => (
        <WorkflowAwareLink
          key={step.title}
          unauthenticatedHref={step.unauthHref}
          profileIncompleteHref={step.profileIncompleteHref}
          documentsMissingHref={step.documentsMissingHref}
          paymentPendingHref={step.paymentPendingHref}
          authenticatedHref={step.authenticatedHref}
          className="group flex items-center gap-4 rounded-lg border bg-background p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors duration-300 group-hover:bg-primary-dark">
            {index + 1}
          </span>
          <div className="flex-1">
            <p className="font-medium">{step.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{step.helper}</p>
          </div>
          <ArrowRight
            className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary"
            aria-hidden="true"
          />
        </WorkflowAwareLink>
      ))}
    </div>
  );
}

const studentJourneySteps = [
  {
    icon: GraduationCap,
    title: "Admission obtenue",
    description: "Vous avez votre lettre d'admission, mais le parcours administratif commence.",
    unauthHref: "/inscription",
    profileIncompleteHref: "/profil",
    authenticatedHref: "/dashboard",
  },
  {
    icon: FileCheck2,
    title: "Documents à préparer",
    description: "AVI, justificatif d'hébergement, ressources financières : chaque pièce doit être cohérente.",
    unauthHref: "/connexion",
    documentsMissingHref: "/dossier/documents",
    authenticatedHref: "/dashboard",
  },
  {
    icon: ShieldCheck,
    title: "Dossier consulaire",
    description: "Campus France, rendez-vous visa : le moindre manque peut retarder votre projet.",
    unauthHref: "/services/accompagnement-visa",
    authenticatedHref: "/services/accompagnement-visa",
  },
];

export function StudentJourneyCards() {
  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {studentJourneySteps.map((step, index) => (
        <WorkflowAwareLink
          key={step.title}
          unauthenticatedHref={step.unauthHref}
          profileIncompleteHref={step.profileIncompleteHref}
          documentsMissingHref={step.documentsMissingHref}
          authenticatedHref={step.authenticatedHref}
          className="group relative overflow-hidden rounded-lg border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/20 transition-colors duration-300 group-hover:bg-accent/30">
              <step.icon className="h-6 w-6 text-accent-light" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-accent-light">Étape {index + 1}</span>
          </div>
          <h3 className="text-xl font-semibold text-white">{step.title}</h3>
          <p className="mt-3 leading-relaxed text-gray-300">{step.description}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent-light">
            En savoir plus
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
        </WorkflowAwareLink>
      ))}
    </div>
  );
}
