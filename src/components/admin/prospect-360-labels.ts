export function prospectDocumentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: "Demandé",
    UPLOADED: "Téléversé",
    UNDER_REVIEW: "En revue",
    APPROVED: "Approuvé",
    REJECTED: "Rejeté",
    EXPIRED: "Expiré",
    PENDING: "En attente",
    CORRECTION_REQUESTED: "Correction demandée",
  };
  return labels[status] ?? "Statut non précisé";
}
