import type { LeadFormValues } from "@/lib/validations/lead";
import {
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export type AdminNewLeadEmailInput = LeadFormValues & {
  id: string;
  receivedAt: number;
};

export function renderAdminNewLeadEmail(
  lead: AdminNewLeadEmailInput,
): EmailTemplate {
  const subject = `Nouveau lead AVI CERTIFY - ${lead.fullName}`;
  const receivedAt = new Date(lead.receivedAt).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const text = [
    "Nouveau lead recu.",
    `Nom: ${lead.fullName}`,
    `Email: ${lead.email}`,
    `Telephone: ${lead.phone}`,
    `Service: ${lead.requestedService}`,
    `Residence: ${lead.residenceCountry}`,
    `Destination: ${lead.destinationCountry}`,
    `Message: ${lead.message ?? "Aucun message"}`,
    `Lead ID: ${lead.id}`,
    `Recu le: ${receivedAt}`,
  ].join("\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Un nouveau prospect vient de remplir le formulaire AVI CERTIFY.",
    children: [
      renderHeading("Nouveau lead recu"),
      renderParagraph(
        "Un prospect vient de soumettre le formulaire public AVI CERTIFY.",
      ),
      renderFieldList([
        ["Lead ID", lead.id],
        ["Nom", lead.fullName],
        ["Email", lead.email],
        ["Telephone", lead.phone],
        ["Service", lead.requestedService],
        ["Residence", lead.residenceCountry],
        ["Destination", lead.destinationCountry],
        ["Message", lead.message ?? "Aucun message"],
        ["Recu le", receivedAt],
      ]),
    ].join(""),
  });

  return { subject, html, text };
}
