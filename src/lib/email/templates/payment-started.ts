import { formatPaymentAmount } from "@/constants/payments";
import type { PaymentRecord } from "@/types/payment";
import {
  renderEmailLayout,
  renderFieldList,
  renderHeading,
  renderParagraph,
  type EmailTemplate,
} from "@/lib/email/templates/shared";

export function renderPaymentStartedEmail(
  payment: PaymentRecord,
): EmailTemplate {
  const amount = formatPaymentAmount(payment.amount, payment.currency);
  const subject = `Paiement demarre - ${payment.serviceLabel}`;
  const text = [
    "Une session de paiement AVI CERTIFY a ete demarree.",
    `Service: ${payment.serviceLabel}`,
    `Montant: ${amount}`,
    "Le statut sera confirme apres validation Stripe.",
  ].join("\n\n");

  const html = renderEmailLayout({
    title: subject,
    preview: "Une session de paiement AVI CERTIFY a ete demarree.",
    children: [
      renderHeading("Paiement demarre"),
      renderParagraph(
        "Une session Stripe Checkout a ete creee pour votre service AVI CERTIFY.",
      ),
      renderFieldList([
        ["Service", payment.serviceLabel],
        ["Montant", amount],
        ["Statut", payment.status],
      ]),
      renderParagraph(
        "Le statut definitif sera confirme automatiquement apres retour de Stripe.",
      ),
    ].join(""),
  });

  return { subject, html, text };
}
