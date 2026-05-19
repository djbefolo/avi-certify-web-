import "server-only";

import { getEmailConfig } from "@/constants/email";
import { getResendClient } from "@/lib/email/resend.client";
import {
  renderAdminNewLeadEmail,
  type AdminNewLeadEmailInput,
} from "@/lib/email/templates/admin-new-lead";
import {
  renderAuthWelcomeEmail,
  type AuthWelcomeEmailInput,
} from "@/lib/email/templates/auth-welcome";
import { renderDocumentReceivedEmail } from "@/lib/email/templates/document-received";
import { renderLeadConfirmationEmail } from "@/lib/email/templates/lead-confirmation";
import { renderPaymentStartedEmail } from "@/lib/email/templates/payment-started";
import type { EmailTemplate } from "@/lib/email/templates/shared";
import type { LeadFormValues } from "@/lib/validations/lead";
import type { UserDocument } from "@/types/document";
import type { PaymentRecord } from "@/types/payment";

type SendEmailParams = {
  to: string | string[] | null;
  template: EmailTemplate;
  replyTo?: string | null;
  context: string;
};

async function sendEmailSafely({
  to,
  template,
  replyTo,
  context,
}: SendEmailParams): Promise<boolean> {
  const resend = getResendClient();
  const config = getEmailConfig();

  if (!resend) {
    return false;
  }

  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.info(`[email] Skipped ${context}: missing recipient.`);
    return false;
  }

  try {
    const response = await resend.emails.send({
      from: config.fromEmail,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: replyTo ?? config.replyTo ?? undefined,
    });

    if (response.error) {
      console.warn(`[email] Failed to send ${context}`, response.error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[email] Failed to send ${context}`, error);
    return false;
  }
}

export async function sendLeadConfirmationEmail(
  lead: LeadFormValues,
): Promise<boolean> {
  return sendEmailSafely({
    to: lead.email,
    template: renderLeadConfirmationEmail(lead),
    context: "lead confirmation",
  });
}

export async function sendAdminNewLeadEmail(
  lead: AdminNewLeadEmailInput,
): Promise<boolean> {
  const config = getEmailConfig();

  return sendEmailSafely({
    to: config.adminEmail,
    template: renderAdminNewLeadEmail(lead),
    replyTo: lead.email,
    context: "admin new lead notification",
  });
}

export async function sendWelcomeEmail(
  user: AuthWelcomeEmailInput,
): Promise<boolean> {
  return sendEmailSafely({
    to: user.email,
    template: renderAuthWelcomeEmail(user),
    context: "auth welcome",
  });
}

export async function sendDocumentReceivedEmail(
  document: UserDocument & { recipientEmail?: string },
): Promise<boolean> {
  return sendEmailSafely({
    to: document.recipientEmail ?? null,
    template: renderDocumentReceivedEmail(document),
    context: "document received",
  });
}

export async function sendPaymentStartedEmail(
  payment: PaymentRecord & { recipientEmail?: string },
): Promise<boolean> {
  return sendEmailSafely({
    to: payment.recipientEmail ?? null,
    template: renderPaymentStartedEmail(payment),
    context: "payment started",
  });
}
