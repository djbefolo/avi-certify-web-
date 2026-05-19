import type {
  ApplicationStatus,
  DocumentStatus,
  PaymentStatus,
  TimelineStepStatus,
} from "@/types/application";

export function getApplicationStatusLabel(status: ApplicationStatus) {
  const labels: Record<ApplicationStatus, string> = {
    draft: "Brouillon",
    documents_pending: "Documents attendus",
    in_review: "En analyse",
    payment_pending: "Paiement attendu",
    validated: "Valide",
    blocked: "Action requise",
  };

  return labels[status];
}

export function getDocumentStatusLabel(status: DocumentStatus) {
  const labels: Record<DocumentStatus, string> = {
    missing: "A fournir",
    pending_review: "En verification",
    approved: "Valide",
    rejected: "A corriger",
  };

  return labels[status];
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    not_started: "Non demarre",
    pending: "En attente",
    paid: "Regle",
    failed: "A reprendre",
  };

  return labels[status];
}

export function getStatusClassName(
  status: ApplicationStatus | DocumentStatus | PaymentStatus | TimelineStepStatus,
) {
  if (status === "approved" || status === "paid" || status === "validated" || status === "completed") {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  if (status === "rejected" || status === "failed" || status === "blocked") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (status === "current" || status === "in_review" || status === "pending_review") {
    return "border-primary/25 bg-primary/10 text-primary";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}
