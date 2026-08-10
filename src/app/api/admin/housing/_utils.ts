import { NextResponse } from "next/server";
import { AdminAuthError, adminErrorResponse } from "@/lib/admin/admin-auth";

const messages: Record<string, string> = {
  HOUSING_REQUEST_NOT_FOUND: "Demande logement introuvable.",
  HOUSING_PAYMENT_NOT_FOUND: "Aucun paiement n'est rattache a cette demande.",
  HOUSING_PAYMENT_NOT_CONFIRMED: "Le paiement Stripe n'est pas confirme ou ne correspond pas a la demande.",
  HOUSING_GENERATION_JOB_NOT_FOUND: "Le job documentaire est introuvable.",
  HOUSING_ALLOCATION_NOT_CONFIRMED: "La confirmation partenaire est requise.",
  HOUSING_REQUEST_CASE_MISMATCH: "La demande et le dossier client ne correspondent pas.",
  HOUSING_DOCUMENT_ALREADY_ISSUED: "Un document a deja ete emis. Utilisez un futur workflow de remplacement audite.",
  HOUSING_INVENTORY_NOT_FOUND: "Residence d'inventaire introuvable.",
  HOUSING_AUTO_ISSUANCE_POLICY_INCOMPLETE: "La residence doit avoir un loyer verifie, une validite future et le statut eligible avant activation.",
  HOUSING_CAPACITY_INVALID: "La capacite restante ne peut pas depasser le quota configure.",
  HOUSING_INVENTORY_NOT_SELECTED: "Aucune residence d'inventaire n'est rattachee a cette demande.",
  HOUSING_AUTO_ALLOCATION_DATA_MISSING: "Les donnees pre-validees de la residence sont incompletes.",
  HOUSING_PRICING_OVERRIDE_REASON_REQUIRED: "Un motif explicite est requis pour modifier le loyer client calcule.",
  HOUSING_VERSIONED_PRICING_MANAGED: "Le loyer versionne doit etre modifie via le workflow de tarification audite.",
};

export function housingAdminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) return adminErrorResponse(error);
  const code = error instanceof Error ? error.message : "HOUSING_WORKFLOW_FAILED";
  if (messages[code]) {
    const status = code === "HOUSING_REQUEST_NOT_FOUND" ? 404 : 409;
    return NextResponse.json(
      { error: code, message: messages[code] },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  console.error("[admin/housing] Workflow failed", { code });
  return NextResponse.json(
    { error: "HOUSING_WORKFLOW_FAILED", message: "Le traitement logement a echoue." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
