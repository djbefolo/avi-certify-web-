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
    <div className="divide-y divide-[#07142B]/15 border-y border-[#07142B]/15">
      {processSteps.map((step, index) => (
        <WorkflowAwareLink
          key={step.title}
          unauthenticatedHref={step.unauthHref}
          profileIncompleteHref={step.profileIncompleteHref}
          documentsMissingHref={step.documentsMissingHref}
          paymentPendingHref={step.paymentPendingHref}
          authenticatedHref={step.authenticatedHref}
          className="group flex items-center gap-4 py-5 transition-colors hover:bg-[#FCFAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset"
        >
          <span className="w-8 shrink-0 text-sm font-semibold text-[#D8A72D]">0{index + 1}</span>
          <div className="flex-1">
            <p className="font-semibold text-[#07142B]">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.helper}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-[#07142B] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </WorkflowAwareLink>
      ))}
    </div>
  );
}

const studentJourneySteps = [
  {
    icon: GraduationCap,
    title: "Admission obtenue",
    description: "Vous avez votre lettre d’admission, mais le parcours administratif commence.",
    unauthHref: "/inscription",
    profileIncompleteHref: "/profil",
    authenticatedHref: "/dashboard",
  },
  {
    icon: FileCheck2,
    title: "Documents à préparer",
    description: "AVI, justificatif d’hébergement, ressources financières : chaque pièce doit être cohérente.",
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
    <div className="mt-12 grid divide-y divide-[#07142B]/15 border-y border-[#07142B]/15 md:grid-cols-3 md:divide-x md:divide-y-0">
      {studentJourneySteps.map((step, index) => (
        <WorkflowAwareLink
          key={step.title}
          unauthenticatedHref={step.unauthHref}
          profileIncompleteHref={step.profileIncompleteHref}
          documentsMissingHref={step.documentsMissingHref}
          authenticatedHref={step.authenticatedHref}
          className={`group py-8 transition-colors hover:bg-[#FCFAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-inset ${index === 0 ? "md:pr-8" : index === studentJourneySteps.length - 1 ? "md:pl-8" : "md:px-8"}`}
        >
          <div className="mb-8 flex items-center gap-3">
            <step.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D8A72D]">Étape 0{index + 1}</span>
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.035em] text-[#07142B]">{step.title}</h3>
          <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#07142B] underline decoration-[#D8A72D] decoration-2 underline-offset-8">
            Voir l’étape
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </WorkflowAwareLink>
      ))}
    </div>
  );
}
