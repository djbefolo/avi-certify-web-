import type { LeadFormValues } from "@/lib/validations/lead";
import {
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export function renderLeadConfirmationEmail(
  lead: LeadFormValues,
): EmailTemplate {
  const subject = "Votre demande AVI CERTIFY a bien ete recue";
  const text = [
    `Bonjour ${lead.fullName},`,
    "Nous avons bien recu votre demande d'accompagnement.",
    "Un conseiller AVI CERTIFY pourra revenir vers vous pour qualifier votre besoin et vous indiquer les prochaines etapes.",
    `Service demande: ${lead.requestedService}`,
    `Pays vise: ${lead.destinationCountry}`,
    "Merci pour votre confiance.",
    "AVI CERTIFY",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Votre demande d'accompagnement a bien ete recue.",
    children: [
      renderHeading("Votre demande a bien ete recue"),
      renderParagraph(`Bonjour ${lead.fullName},`),
      renderParagraph(
        "Nous avons bien recu votre demande. Un conseiller AVI CERTIFY pourra vous recontacter pour qualifier votre projet et preparer les prochaines etapes.",
      ),
      renderFieldList([
        ["Service demande", lead.requestedService],
        ["Pays de residence", lead.residenceCountry],
        ["Pays vise", lead.destinationCountry],
      ]),
      renderParagraph(
        "Vous n'avez rien d'autre a faire pour le moment. Conservez simplement cet email comme confirmation de reception.",
      ),
    ].join(""),
  });

  return { subject, html, text };
}
