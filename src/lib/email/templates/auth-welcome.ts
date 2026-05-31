import {
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type AuthWelcomeEmailInput = {
  email: string;
  fullName: string;
};

export function renderAuthWelcomeEmail(
  user: AuthWelcomeEmailInput,
): EmailTemplate {
  const subject = "Bienvenue dans votre espace AVI CERTIFY";
  const verificationNotice =
    "Important\n\nPour sécuriser votre espace AVI CERTIFY, une vérification email est nécessaire avant l’accès complet à votre espace client.\n\nSi vous ne voyez pas notre email de confirmation, pensez à vérifier votre dossier spam / courrier indésirable.\n\nRevenez ensuite sur AVI CERTIFY et cliquez sur « J’ai vérifié mon email ».";
  const text = [
    `Bonjour ${user.fullName},`,
    "Votre compte AVI CERTIFY est actif.",
    "Vous pouvez maintenant acceder a votre espace client pour suivre votre dossier et preparer vos documents.",
    verificationNotice,
    "AVI CERTIFY",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre compte AVI CERTIFY est actif.",
    children: [
      renderHeading("Bienvenue dans votre espace AVI CERTIFY"),
      renderParagraph(`Bonjour ${user.fullName},`),
      renderParagraph(
        "Votre compte est maintenant actif. Vous pouvez acceder a votre espace client pour suivre votre dossier, envoyer vos documents et consulter les prochaines etapes.",
      ),
      renderParagraph(
        "Notre equipe reste disponible pour vous accompagner dans votre parcours.",
      ),
      `<div style="margin:18px 0 4px;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:16px;">
        <p style="margin:0 0 8px;color:#0f3f7a;font-size:14px;font-weight:700;">Important</p>
        ${renderParagraph(
          "Pour sécuriser votre espace AVI CERTIFY, une vérification email est nécessaire avant l’accès complet à votre espace client.",
        )}
        ${renderParagraph(
          "Si vous ne voyez pas notre email de confirmation, pensez à vérifier votre dossier spam / courrier indésirable.",
        )}
        ${renderParagraph(
          "Revenez ensuite sur AVI CERTIFY et cliquez sur « J’ai vérifié mon email ».",
        )}
      </div>`,
    ].join(""),
  });

  return { subject, html, text };
}
