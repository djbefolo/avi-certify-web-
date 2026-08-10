import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

const PROFILE_URL = "https://www.avicertify.fr/profil";

function renderProfileButton() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;">
    <tr>
      <td bgcolor="#1656a3" style="border-radius:6px;">
        <a href="${escapeHtml(PROFILE_URL)}" style="display:inline-block;background:#1656a3;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">Compléter mon profil</a>
      </td>
    </tr>
  </table>`;
}

function renderFallbackLink() {
  return `<p style="margin:0 0 14px;line-height:26px;color:#334155;font-size:15px;">Si le bouton ne fonctionne pas, ouvrez :<br /><a href="${escapeHtml(PROFILE_URL)}" style="color:#1656a3;text-decoration:underline;word-break:break-all;">${escapeHtml(PROFILE_URL)}</a></p>`;
}

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
    "Votre adresse email est désormais vérifiée et votre espace AVI CERTIFY est actif.",
    "La prochaine étape consiste à compléter votre profil. Quelques informations nous permettront de mieux qualifier votre projet.",
    "Vous pourrez ensuite accéder à votre dashboard et aux services AVI CERTIFY.",
    `Compléter mon profil : ${PROFILE_URL}`,
    `Si le bouton ne fonctionne pas, ouvrez : ${PROFILE_URL}`,
    "AVI CERTIFY",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre compte AVI CERTIFY est actif.",
    children: [
      renderHeading("Bienvenue dans votre espace AVI CERTIFY"),
      renderParagraph(greeting),
      renderParagraph(
        "Votre adresse email est désormais vérifiée et votre espace AVI CERTIFY est actif.",
      ),
      renderParagraph(
        "La prochaine étape consiste à compléter votre profil. Quelques informations nous permettront de mieux qualifier votre projet.",
      ),
      renderParagraph(
        "Vous pourrez ensuite accéder à votre dashboard et aux services AVI CERTIFY.",
      ),
      renderProfileButton(),
      renderFallbackLink(),
    ].join(""),
  });

  return { subject, html, text };
}
