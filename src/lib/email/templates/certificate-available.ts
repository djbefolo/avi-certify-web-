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
  certificateReference?: string | null;
  city?: string | null;
};

function renderButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 16px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}

export function renderCertificateAvailableEmail({
  studentFullName,
  clientSpaceUrl,
  verificationUrl,
  certificateReference,
  city,
}: CertificateAvailableEmailInput): EmailTemplate {
  const greeting = studentFullName ? `Bonjour ${studentFullName},` : "Bonjour,";
  const details = [
    certificateReference ? `Reference : ${certificateReference}` : null,
    city ? `Ville : ${city}` : null,
  ].filter(Boolean) as string[];
  const html = renderEmailLayout({
    title: "Votre attestation conditionnelle de logement est disponible",
    preview: "Votre document est disponible dans votre espace client securise.",
    children: [
      renderHeading("Votre attestation conditionnelle de logement est disponible"),
      renderParagraph(greeting),
      renderParagraph(
        "Votre paiement a ete confirme et la disponibilite de la solution proposee a ete verifiee par AVI CERTIFY.",
      ),
      ...details.map(renderParagraph),
      renderParagraph(
        "Votre document est disponible dans votre espace client securise. Il reste conditionnel et ne constitue ni un bail definitif ni une garantie de visa.",
      ),
      renderButton("Acceder a mes documents", clientSpaceUrl),
      verificationUrl
        ? renderButton("Verifier l'authenticite", verificationUrl)
        : "",
      renderParagraph(
        "Pour proteger vos donnees, le PDF n'est pas joint a cet email.",
      ),
      renderParagraph("L'equipe AVI CERTIFY"),
    ].join(""),
  });

  return {
    subject: "Votre attestation conditionnelle de logement AVI CERTIFY est disponible",
    html,
    text: [
      greeting,
      "",
      "Votre paiement a ete confirme et la disponibilite de la solution proposee a ete verifiee par AVI CERTIFY.",
      ...details,
      "Votre document reste conditionnel et ne constitue ni un bail definitif ni une garantie de visa.",
      `Espace client : ${clientSpaceUrl}`,
      verificationUrl ? `Verification : ${verificationUrl}` : "",
      "",
      "L'equipe AVI CERTIFY",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
