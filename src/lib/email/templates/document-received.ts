import { documentTypeLabels } from "@/lib/validations/document";
import type { UserDocument } from "@/types/document";
import {
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export function renderDocumentReceivedEmail(
  document: UserDocument,
): EmailTemplate {
  const documentLabel = documentTypeLabels[document.documentType];
  const subject = `Document recu - ${documentLabel}`;
  const text = [
    "Nous avons bien recu votre document.",
    `Type: ${documentLabel}`,
    `Fichier: ${document.originalFileName}`,
    "Il pourra etre analyse par l'equipe AVI CERTIFY.",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre document a bien ete recu.",
    children: [
      renderHeading("Document recu"),
      renderParagraph(
        "Votre document a bien ete enregistre dans votre espace client.",
      ),
      renderFieldList([
        ["Type", documentLabel],
        ["Fichier", document.originalFileName],
        ["Statut", document.status],
      ]),
      renderParagraph(
        "L'equipe AVI CERTIFY pourra le verifier dans le cadre du traitement de votre dossier.",
      ),
    ].join(""),
  });

  return { subject, html, text };
}
