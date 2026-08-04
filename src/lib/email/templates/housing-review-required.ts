import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type HousingReviewRequiredEmailInput = {
  studentFullName: string;
  clientSpaceUrl: string;
  caseNumber?: string | null;
};

export function renderHousingReviewRequiredEmail({
  studentFullName,
  clientSpaceUrl,
  caseNumber,
}: HousingReviewRequiredEmailInput): EmailTemplate {
  const greeting = studentFullName ? `Bonjour ${studentFullName},` : "Bonjour,";
  const button = `<a href="${escapeHtml(clientSpaceUrl)}" style="display:inline-block;margin:8px 0 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">Suivre mon dossier</a>`;
  const message =
    "Votre paiement est confirme. Votre demande necessite une verification administrative avant emission de l'attestation. Aucun paiement supplementaire n'est requis.";
  return {
    subject: "Paiement confirme - verification de votre attestation logement",
    html: renderEmailLayout({
      title: "Votre demande est en verification",
      preview: "Paiement confirme, verification administrative en cours.",
      children: [
        renderHeading("Votre demande est en verification"),
        renderParagraph(greeting),
        renderParagraph(message),
        caseNumber ? renderParagraph(`Dossier : ${caseNumber}`) : "",
        renderParagraph(
          "Notre equipe vous informera dans votre espace client des que l'attestation sera disponible ou si une precision est necessaire.",
        ),
        button,
        renderParagraph("L'equipe AVI CERTIFY"),
      ].join(""),
    }),
    text: [
      greeting,
      "",
      message,
      caseNumber ? `Dossier : ${caseNumber}` : "",
      `Suivi : ${clientSpaceUrl}`,
      "",
      "L'equipe AVI CERTIFY",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
