import {
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type HousingAdminReviewRequiredEmailInput = {
  clientName: string;
  clientEmail: string | null;
  caseId: string;
  city: string;
  residenceName: string | null;
  paymentId: string;
};

export function renderHousingAdminReviewRequiredEmail(
  input: HousingAdminReviewRequiredEmailInput,
): EmailTemplate {
  const summary = input.residenceName
    ? `Residence selectionnee : ${input.residenceName}.`
    : "Residence selectionnee : a verifier dans le dossier.";

  return {
    subject: "Nouvelle demande logement payee - validation requise",
    html: renderEmailLayout({
      title: "Validation logement requise",
      preview: "Une demande logement payee attend une verification administrative.",
      children: [
        renderHeading("Nouvelle demande logement payee"),
        renderParagraph("Une verification administrative est requise avant toute emission d'attestation."),
        renderFieldList([
          ["Client", input.clientName],
          ["Email", input.clientEmail],
          ["Dossier", input.caseId],
          ["Ville", input.city],
          ["Residence", input.residenceName],
          ["Paiement", input.paymentId],
        ]),
        renderParagraph(summary),
        renderParagraph("Statut paiement : confirme. Action attendue : verifier puis confirmer l'attribution dans l'Admin OS."),
      ].join(""),
    }),
    text: [
      "Nouvelle demande logement payee - validation requise",
      `Client : ${input.clientName}`,
      input.clientEmail ? `Email : ${input.clientEmail}` : "",
      `Dossier : ${input.caseId}`,
      `Ville : ${input.city}`,
      summary,
      `Paiement : ${input.paymentId}`,
      "Action attendue : verifier puis confirmer l'attribution dans l'Admin OS.",
    ].filter(Boolean).join("\n"),
  };
}
