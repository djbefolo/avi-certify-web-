import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type QuoteReadyEmailInput = {
  clientName: string | null;
  quoteId: string;
  dashboardUrl: string;
};

export function renderQuoteReadyEmail(input: QuoteReadyEmailInput): EmailTemplate {
  const clientName = input.clientName?.trim() || "cher étudiant";
  return {
    subject: "Votre devis AVI CERTIFY est disponible",
    text: [
      `Bonjour ${clientName},`,
      "",
      `Votre devis AVI CERTIFY ${input.quoteId} est disponible dans votre espace sécurisé.`,
      input.dashboardUrl,
    ].join("\n"),
    html: renderEmailLayout({
      title: "Votre devis AVI CERTIFY est disponible",
      preview: "Votre devis AVI CERTIFY est disponible dans votre espace sécurisé.",
      children: `
        ${renderHeading("Votre devis est disponible")}
        ${renderParagraph(`Bonjour ${clientName},`)}
        ${renderParagraph(`Votre devis AVI CERTIFY ${input.quoteId} est disponible dans votre espace client sécurisé.`)}
        <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;margin:8px 0 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;">Ouvrir mes devis</a>
        ${renderParagraph("Notre équipe reste disponible sur WhatsApp ou par email pour clarifier les prochaines étapes.")}
      `,
    }),
  };
}
