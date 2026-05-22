import {
  escapeHtml,
  renderEmailLayout,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type CertificateAvailableEmailInput = {
  studentFullName: string;
  clientSpaceUrl: string;
  verificationUrl: string | null;
};

function renderButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 18px;background:#1656a3;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function renderCertificateAvailableEmail({
  studentFullName,
  clientSpaceUrl,
  verificationUrl,
}: CertificateAvailableEmailInput): EmailTemplate {
  const greeting = studentFullName
    ? `Bonjour ${studentFullName},`
    : "Bonjour,";
  const verificationText = verificationUrl
    ? `Lien de vérification : ${verificationUrl}`
    : "Le lien de vérification est disponible dans votre espace client.";
  const html = renderEmailLayout({
    title: "Votre attestation AVI CERTIFY est disponible",
    preview: "Votre attestation d'hébergement est disponible dans votre espace client sécurisé.",
    children: [
      renderHeading("Votre attestation AVI CERTIFY est disponible"),
      renderParagraph(greeting),
      renderParagraph(
        "Nous vous confirmons la bonne réception de votre paiement.",
      ),
      renderParagraph(
        "Votre attestation d'hébergement a été générée et peut être téléchargée depuis votre espace client sécurisé AVI CERTIFY.",
      ),
      renderButton("Accéder à mes documents", clientSpaceUrl),
      verificationUrl
        ? renderParagraph(
            "Vous pouvez également vérifier l'authenticité du document depuis le lien public ci-dessous.",
          )
        : "",
      verificationUrl
        ? renderButton("Vérifier l'authenticité", verificationUrl)
        : "",
      renderParagraph(
        "Pour des raisons de sécurité et de confidentialité, le document PDF n'est pas joint à cet email.",
      ),
      renderParagraph("L'équipe AVI CERTIFY"),
    ].join(""),
  });

  return {
    subject: "Votre attestation AVI CERTIFY est disponible",
    html,
    text: [
      greeting,
      "",
      "Nous vous confirmons la bonne réception de votre paiement.",
      "Votre attestation d'hébergement a été générée et peut être téléchargée depuis votre espace client sécurisé AVI CERTIFY.",
      "",
      `Espace client : ${clientSpaceUrl}`,
      verificationText,
      "",
      "Pour des raisons de sécurité et de confidentialité, le document PDF n'est pas joint à cet email.",
      "",
      "L'équipe AVI CERTIFY",
    ].join("\n"),
  };
}
