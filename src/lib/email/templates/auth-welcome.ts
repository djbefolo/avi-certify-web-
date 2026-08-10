import {
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type AuthWelcomeEmailInput = {
  email: string;
  fullName?: string | null;
};

export function renderAuthWelcomeEmail(
  user: AuthWelcomeEmailInput,
): EmailTemplate {
  const subject = "Bienvenue dans votre espace AVI CERTIFY";
  const greeting = user.fullName?.trim()
    ? `Bonjour ${user.fullName.trim()},`
    : "Bonjour,";
  const text = [
    greeting,
    "Votre compte AVI CERTIFY est actif.",
    "Vous pouvez maintenant acceder a votre espace client pour suivre votre dossier et preparer vos documents.",
    "AVI CERTIFY",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre compte AVI CERTIFY est actif.",
    children: [
      renderHeading("Bienvenue dans votre espace AVI CERTIFY"),
      renderParagraph(greeting),
      renderParagraph(
        "Votre compte est maintenant actif. Vous pouvez acceder a votre espace client pour suivre votre dossier, envoyer vos documents et consulter les prochaines etapes.",
      ),
      renderParagraph(
        "Notre equipe reste disponible pour vous accompagner dans votre parcours.",
      ),
    ].join(""),
  });

  return { subject, html, text };
}
