import type {
  ApplicationDocument,
  ApplicationPayment,
  ApplicationStatus,
  TimelineStep,
} from "@/types/application";

export type DossierWorkflowStatus = ApplicationStatus;

type NextAction = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export type DossierWorkflow = {
  status: DossierWorkflowStatus;
  label: string;
  currentStep: string;
  completionPercent: number;
  timeline: TimelineStep[];
  nextAction: NextAction;
};

function getRequiredDocuments(documents: ApplicationDocument[]) {
  return documents.filter((document) => document.required);
}

function getDocumentWorkflowStatus(document: ApplicationDocument) {
  return document.workflowStatus ?? document.status;
}

function hasMissingRequiredDocument(documents: ApplicationDocument[]) {
  return getRequiredDocuments(documents).some(
    (document) => getDocumentWorkflowStatus(document) === "missing",
  );
}

function hasRejectedRequiredDocument(documents: ApplicationDocument[]) {
  return getRequiredDocuments(documents).some(
    (document) => getDocumentWorkflowStatus(document) === "rejected",
  );
}

function hasUnderReviewRequiredDocument(documents: ApplicationDocument[]) {
  return getRequiredDocuments(documents).some(
    (document) => getDocumentWorkflowStatus(document) === "under_review",
  );
}

function hasUploadedRequiredDocument(documents: ApplicationDocument[]) {
  return getRequiredDocuments(documents).some((document) =>
    ["uploaded", "under_review", "approved"].includes(
      getDocumentWorkflowStatus(document),
    ),
  );
}

function allRequiredDocumentsApproved(documents: ApplicationDocument[]) {
  const requiredDocuments = getRequiredDocuments(documents);

  return (
    requiredDocuments.length > 0 &&
    requiredDocuments.every(
      (document) => getDocumentWorkflowStatus(document) === "approved",
    )
  );
}

function allRequiredDocumentsProvided(documents: ApplicationDocument[]) {
  const requiredDocuments = getRequiredDocuments(documents);

  return (
    requiredDocuments.length > 0 &&
    requiredDocuments.every(
      (document) => getDocumentWorkflowStatus(document) !== "missing",
    )
  );
}

export function getDossierWorkflowStatus({
  documents,
  payment,
}: {
  documents: ApplicationDocument[];
  payment: ApplicationPayment;
}): DossierWorkflowStatus {
  if (hasRejectedRequiredDocument(documents)) {
    return "rejected";
  }

  if (hasMissingRequiredDocument(documents)) {
    return "documents_pending";
  }

  if (payment.status === "not_started") {
    return hasUploadedRequiredDocument(documents)
      ? "ready_for_payment"
      : "account_created";
  }

  if (payment.status === "pending") {
    return "payment_pending";
  }

  if (payment.status !== "paid") {
    return "payment_pending";
  }

  if (allRequiredDocumentsApproved(documents)) {
    return "approved";
  }

  if (hasUnderReviewRequiredDocument(documents)) {
    return "under_review";
  }

  return allRequiredDocumentsProvided(documents)
    ? "payment_confirmed"
    : "documents_pending";
}

function getWorkflowLabel(status: DossierWorkflowStatus) {
  const labels: Record<DossierWorkflowStatus, string> = {
    account_created: "Compte cree",
    documents_pending: "Documents a fournir",
    ready_for_payment: "Dossier pret pour paiement",
    payment_pending: "Paiement en attente",
    payment_confirmed: "Paiement confirme",
    under_review: "Dossier en analyse",
    approved: "Dossier valide",
    rejected: "Correction requise",
  };

  return labels[status];
}

function getCompletionPercent(status: DossierWorkflowStatus) {
  const percentages: Record<DossierWorkflowStatus, number> = {
    account_created: 10,
    documents_pending: 25,
    ready_for_payment: 55,
    payment_pending: 65,
    payment_confirmed: 80,
    under_review: 85,
    approved: 100,
    rejected: 45,
  };

  // TODO: Include verified Firestore profile completeness once required profile
  // fields are finalized by the business workflow.
  return percentages[status];
}

function getTimelineStatus(
  step: "account" | "documents" | "payment" | "analysis" | "validation",
  status: DossierWorkflowStatus,
): TimelineStep["status"] {
  const order: Record<DossierWorkflowStatus, number> = {
    account_created: 0,
    documents_pending: 1,
    ready_for_payment: 2,
    payment_pending: 2,
    payment_confirmed: 3,
    under_review: 3,
    approved: 4,
    rejected: 1,
  };
  const stepOrder = {
    account: 0,
    documents: 1,
    payment: 2,
    analysis: 3,
    validation: 4,
  } satisfies Record<typeof step, number>;
  const currentOrder = order[status];
  const currentStepOrder = stepOrder[step];

  if (currentStepOrder < currentOrder) {
    return "completed";
  }

  if (currentStepOrder === currentOrder) {
    return "current";
  }

  return "upcoming";
}

function getTimeline(status: DossierWorkflowStatus): TimelineStep[] {
  return [
    {
      id: "account",
      title: "Compte cree",
      description: "Votre espace client est actif.",
      status: getTimelineStatus("account", status),
    },
    {
      id: "documents",
      title: "Documents",
      description: "Les pieces requises sont controlees depuis Firestore.",
      status: getTimelineStatus("documents", status),
    },
    {
      id: "payment",
      title: "Paiement",
      description: "Le paiement est suivi depuis les donnees Stripe synchronisees.",
      status: getTimelineStatus("payment", status),
    },
    {
      id: "analysis",
      title: "Analyse",
      description: "L'equipe AVI CERTIFY analyse le dossier complet.",
      status: getTimelineStatus("analysis", status),
    },
    {
      id: "validation",
      title: "Validation",
      description: "La decision finale est rattachee au dossier.",
      status: getTimelineStatus("validation", status),
    },
  ];
}

function getNextAction(status: DossierWorkflowStatus): NextAction {
  const actions: Record<DossierWorkflowStatus, NextAction> = {
    account_created: {
      title: "Completer les documents requis",
      description: "Ajoutez les pieces requises pour demarrer votre dossier.",
      href: "/dossier/documents",
      ctaLabel: "Voir les documents",
    },
    documents_pending: {
      title: "Completer les documents requis",
      description:
        "Ajoutez les pieces manquantes pour permettre a l'equipe de continuer l'analyse.",
      href: "/dossier/documents",
      ctaLabel: "Voir les documents",
    },
    ready_for_payment: {
      title: "Proceder au paiement",
      description: "Vos documents requis sont presents. Vous pouvez continuer le paiement securise.",
      href: "/dossier/paiement",
      ctaLabel: "Voir le paiement",
    },
    payment_pending: {
      title: "Finaliser le paiement",
      description: "Une session de paiement est en attente de confirmation.",
      href: "/dossier/paiement",
      ctaLabel: "Voir le paiement",
    },
    payment_confirmed: {
      title: "Paiement confirme",
      description: "Votre paiement est confirme. Le dossier va passer en analyse.",
      href: "/dossier",
      ctaLabel: "Voir le dossier",
    },
    under_review: {
      title: "Votre dossier est en analyse",
      description: "L'equipe AVI CERTIFY examine les documents transmis.",
      href: "/dossier",
      ctaLabel: "Voir le dossier",
    },
    approved: {
      title: "Votre dossier est valide",
      description: "Votre dossier AVI CERTIFY est valide.",
      href: "/dossier",
      ctaLabel: "Voir le dossier",
    },
    rejected: {
      title: "Corriger les documents demandes",
      description: "Un ou plusieurs documents requis doivent etre corriges.",
      href: "/dossier/documents",
      ctaLabel: "Corriger",
    },
  };

  return actions[status];
}

export function buildDossierWorkflow({
  documents,
  payment,
}: {
  documents: ApplicationDocument[];
  payment: ApplicationPayment;
}): DossierWorkflow {
  const status = getDossierWorkflowStatus({ documents, payment });
  const label = getWorkflowLabel(status);

  return {
    status,
    label,
    currentStep: label,
    completionPercent: getCompletionPercent(status),
    timeline: getTimeline(status),
    nextAction: getNextAction(status),
  };
}
