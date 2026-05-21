import type {
  ApplicationStatus,
  DocumentStatus,
  PaymentStatus,
  TimelineStepStatus,
} from "@/types/application";

type StatusStyle =
  | ApplicationStatus
  | DocumentStatus
  | PaymentStatus
  | TimelineStepStatus
  | "uploaded";

export function getApplicationStatusLabel(status: ApplicationStatus) {
  const labels: Record<ApplicationStatus, string> = {
    account_created: "Compte créé",
    documents_pending: "Documents à fournir",
    ready_for_payment: "Dossier prêt pour paiement",
    payment_pending: "Paiement en attente",
    payment_confirmed: "Paiement confirmé",
    under_review: "Dossier en analyse",
    approved: "Dossier validé",
    rejected: "Correction requise",
  };

  return labels[status];
}

export function getDocumentStatusLabel(status: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    missing: "À fournir",
    pending_review: "En vérification",
    approved: "Validé",
    rejected: "À corriger",
  };

  return labels[status];
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    not_started: "Non démarré",
    pending: "En attente",
    paid: "Payé",
    failed: "Échec",
    refunded: "Remboursé",
  };

  return labels[status];
}

export function getStatusClassName(status: StatusStyle) {
  if (
    status === "approved" ||
    status === "paid" ||
    status === "payment_confirmed" ||
    status === "completed"
  ) {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  if (status === "rejected" || status === "failed") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (
    status === "under_review" ||
    status === "uploaded" ||
    status === "pending_review" ||
    status === "current"
  ) {
    return "border-primary/25 bg-primary/10 text-primary";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}
