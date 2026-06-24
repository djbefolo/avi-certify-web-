import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type GuideAvailableEmailInput = {
  leadFullName: string | null;
  dashboardUrl: string;
};

function renderButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 18px;background:#1656a3;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function renderGuideAvailableEmail({
  leadFullName,
  dashboardUrl,
}: GuideAvailableEmailInput): EmailTemplate {
  const greeting = leadFullName?.trim()
    ? `Bonjour ${leadFullName.trim()},`
    : "Bonjour,";
  const subject = "Votre guide AVI CERTIFY est disponible";
  const html = renderEmailLayout({
    title: subject,
    preview:
      "Votre guide AVI CERTIFY est disponible depuis votre espace client securise.",
    children: [
      renderHeading("Votre guide AVI CERTIFY est disponible"),
      renderParagraph(greeting),
      renderParagraph(
        "Merci pour votre demande. Le guide AVI CERTIFY 2026 pour preparer votre installation en France est pret.",
      ),
      renderParagraph(
        "Pour proteger vos informations et nos ressources, le guide est accessible depuis votre espace client securise AVI CERTIFY.",
      ),
      renderButton("Acceder a mon espace client", dashboardUrl),
      renderParagraph(
        "Aucun fichier PDF n'est joint a cet email et aucun lien public direct vers le guide n'est partage.",
      ),
      renderParagraph(
        "Si vous n'avez pas encore finalise votre compte, utilisez la meme adresse email pour continuer votre parcours.",
      ),
      renderParagraph("L'equipe AVI CERTIFY"),
    ].join(""),
  });

  return {
    subject,
    html,
    text: [
      greeting,
      "",
      "Merci pour votre demande. Le guide AVI CERTIFY 2026 pour preparer votre installation en France est pret.",
      "Pour proteger vos informations et nos ressources, le guide est accessible depuis votre espace client securise AVI CERTIFY.",
      "",
      `Espace client : ${dashboardUrl}`,
      "",
      "Aucun fichier PDF n'est joint a cet email et aucun lien public direct vers le guide n'est partage.",
      "Si vous n'avez pas encore finalise votre compte, utilisez la meme adresse email pour continuer votre parcours.",
      "",
      "L'equipe AVI CERTIFY",
    ].join("\n"),
  };
}
