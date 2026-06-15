import {
  escapeHtml,
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type DocumentRequestEmailInput = {
  clientName: string | null;
  caseNumber: string;
  documentLabels: string[];
  message?: string | null;
  dashboardUrl: string;
  supportEmail: string;
};

export function renderDocumentRequestEmail(input: DocumentRequestEmailInput): EmailTemplate {
  const clientName = input.clientName?.trim() || "cher étudiant";
  const docs = input.documentLabels.map((label) => `- ${label}`).join("\n");
  const htmlDocs = input.documentLabels
    .map(
      (label) =>
        `<li style="margin:8px 0;color:#0f172a;font-size:15px;">${escapeHtml(label)}</li>`,
    )
    .join("");

  return {
    subject: "Documents requis — AVI CERTIFY",
    text: [
      `Bonjour ${clientName},`,
      "",
      "AVI CERTIFY vous demande de compléter votre dossier avec les documents suivants :",
      docs,
      input.message ? `Message AVI CERTIFY : ${input.message}` : "",
      "",
      `Déposez vos documents depuis votre espace sécurisé : ${input.dashboardUrl}`,
      `Support : ${input.supportEmail}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderEmailLayout({
      title: "Documents requis — AVI CERTIFY",
      preview: "Des documents sont requis pour compléter votre dossier AVI CERTIFY.",
      children: `
        ${renderHeading("Documents requis pour votre dossier")}
        ${renderParagraph(`Bonjour ${clientName},`)}
        ${renderParagraph("Notre équipe vous demande de compléter votre dossier AVI CERTIFY avec les pièces listées ci-dessous.")}
        ${renderFieldList([
          ["Dossier", input.caseNumber],
          ["Support", input.supportEmail],
        ])}
        <ul style="margin:0 0 18px 20px;padding:0;">${htmlDocs}</ul>
        ${
          input.message
            ? `<div style="margin:18px 0;padding:14px;border:1px solid #dbe3ef;border-radius:6px;background:#f8fafc;color:#334155;font-size:14px;line-height:22px;">${escapeHtml(input.message)}</div>`
            : ""
        }
        <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;margin:8px 0 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;">Ouvrir mon espace sécurisé</a>
        ${renderParagraph("Les documents doivent être lisibles et déposés depuis votre espace client sécurisé. Ne répondez pas avec des pièces jointes sensibles si vous n'êtes pas certain de l'adresse utilisée.")}
      `,
    }),
  };
}
