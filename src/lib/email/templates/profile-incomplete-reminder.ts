import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export const PROFILE_REMINDER_URL = "https://www.avicertify.fr/profil";

function renderProfileButton() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 18px;">
    <tr>
      <td bgcolor="#1656a3" style="border-radius:6px;">
        <a href="${escapeHtml(PROFILE_REMINDER_URL)}" style="display:inline-block;background:#1656a3;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">Compléter mon profil</a>
      </td>
    </tr>
  </table>`;
}

function renderFallbackLink() {
  return `<p style="margin:0 0 14px;line-height:26px;color:#334155;font-size:15px;">Si le bouton ne fonctionne pas, ouvrez :<br /><a href="${escapeHtml(PROFILE_REMINDER_URL)}" style="color:#1656a3;text-decoration:underline;word-break:break-all;">${escapeHtml(PROFILE_REMINDER_URL)}</a></p>`;
}

export type ProfileIncompleteReminderEmailInput = {
  email: string;
  fullName?: string | null;
};

export function renderProfileIncompleteReminderEmail(
  user: ProfileIncompleteReminderEmailInput,
): EmailTemplate {
  const subject = "Complétez votre profil AVI CERTIFY";
  const greeting = user.fullName?.trim()
    ? `Bonjour ${user.fullName.trim()},`
    : "Bonjour,";
  const text = [
    greeting,
    "Votre espace AVI CERTIFY est actif, mais votre profil est encore incomplet.",
    "Quelques informations complémentaires nous permettront de mieux préparer votre projet.",
    `Compléter mon profil : ${PROFILE_REMINDER_URL}`,
    `Si le bouton ne fonctionne pas, ouvrez : ${PROFILE_REMINDER_URL}`,
    "Ce message transactionnel est lié à votre compte AVI CERTIFY.",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre profil AVI CERTIFY est encore incomplet.",
    footer: "Ce message transactionnel est lié à votre compte AVI CERTIFY.",
    children: [
      renderHeading(subject),
      renderParagraph(greeting),
      renderParagraph(
        "Votre espace AVI CERTIFY est actif, mais votre profil est encore incomplet.",
      ),
      renderParagraph(
        "Quelques informations complémentaires nous permettront de mieux préparer votre projet.",
      ),
      renderProfileButton(),
      renderFallbackLink(),
    ].join(""),
  });

  return { subject, html, text };
}
