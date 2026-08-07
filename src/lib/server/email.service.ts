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
import {
  renderCertificateAvailableEmail,
  type CertificateAvailableEmailInput,
} from "@/lib/email/templates/certificate-available";
import { renderDocumentReceivedEmail } from "@/lib/email/templates/document-received";
import {
  renderDocumentRequestEmail,
  type DocumentRequestEmailInput,
} from "@/lib/email/templates/document-request";
import {
  renderGuideAvailableEmail,
  type GuideAvailableEmailInput,
} from "@/lib/email/templates/guide-available";
import { renderLeadConfirmationEmail } from "@/lib/email/templates/lead-confirmation";
import { renderPaymentStartedEmail } from "@/lib/email/templates/payment-started";
import {
  renderHousingReviewRequiredEmail,
  type HousingReviewRequiredEmailInput,
} from "@/lib/email/templates/housing-review-required";
import {
  renderHousingAdminReviewRequiredEmail,
  type HousingAdminReviewRequiredEmailInput,
} from "@/lib/email/templates/housing-admin-review-required";
import {
  renderQuoteReadyEmail,
  type QuoteReadyEmailInput,
} from "@/lib/email/templates/quote-ready";
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

export type SendEmailResult = {
  sent: boolean;
  messageId: string | null;
  status: "SENT" | "EMAIL_NOT_CONFIGURED" | "RECIPIENT_MISSING" | "SEND_FAILED";
  provider: "resend";
};

async function sendEmailSafely({
  to,
  template,
  replyTo,
  context,
}: SendEmailParams): Promise<boolean> {
  const result = await sendEmailWithResult({ to, template, replyTo, context });
  return result.sent;
}

async function sendEmailWithResult({
  to,
  template,
  replyTo,
  context,
}: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResendClient();
  const config = getEmailConfig();

  if (!resend) {
    return {
      sent: false,
      messageId: null,
      status: "EMAIL_NOT_CONFIGURED",
      provider: "resend",
    };
  }

  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.info(`[email] Skipped ${context}: missing recipient.`);
    return {
      sent: false,
      messageId: null,
      status: "RECIPIENT_MISSING",
      provider: "resend",
    };
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
      return {
        sent: false,
        messageId: null,
        status: "SEND_FAILED",
        provider: "resend",
      };
    }

    return {
      sent: true,
      messageId: response.data?.id ?? null,
      status: "SENT",
      provider: "resend",
    };
  } catch (error) {
    console.warn(`[email] Failed to send ${context}`, error);
    return {
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    };
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

export async function sendDocumentRequestEmail(
  input: DocumentRequestEmailInput & { recipientEmail?: string | null },
): Promise<SendEmailResult> {
  return sendEmailWithResult({
    to: input.recipientEmail ?? null,
    template: renderDocumentRequestEmail(input),
    context: "document request",
  });
}

export async function sendGuideAvailableEmail(
  input: GuideAvailableEmailInput & { recipientEmail?: string | null },
): Promise<SendEmailResult> {
  return sendEmailWithResult({
    to: input.recipientEmail ?? null,
    template: renderGuideAvailableEmail(input),
    context: "guide available",
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

export async function sendQuoteReadyEmail(
  input: QuoteReadyEmailInput & { recipientEmail?: string | null },
): Promise<SendEmailResult> {
  return sendEmailWithResult({
    to: input.recipientEmail ?? null,
    template: renderQuoteReadyEmail(input),
    context: "quote ready",
  });
}

export async function sendCertificateAvailableEmail(
  certificate: CertificateAvailableEmailInput & { recipientEmail?: string | null },
): Promise<boolean> {
  return sendEmailSafely({
    to: certificate.recipientEmail ?? null,
    template: renderCertificateAvailableEmail(certificate),
    context: "certificate available",
  });
}

export async function sendCertificateAvailableEmailWithResult(
  certificate: CertificateAvailableEmailInput & { recipientEmail?: string | null },
): Promise<SendEmailResult> {
  return sendEmailWithResult({
    to: certificate.recipientEmail ?? null,
    template: renderCertificateAvailableEmail(certificate),
    context: "certificate available",
  });
}

export async function sendHousingReviewRequiredEmail(
  input: HousingReviewRequiredEmailInput & { recipientEmail?: string | null },
): Promise<SendEmailResult> {
  return sendEmailWithResult({
    to: input.recipientEmail ?? null,
    template: renderHousingReviewRequiredEmail(input),
    context: "housing administrative review required",
  });
}

export async function sendHousingAdminReviewRequiredEmail(
  input: HousingAdminReviewRequiredEmailInput,
): Promise<SendEmailResult> {
  const config = getEmailConfig();
  return sendEmailWithResult({
    to: config.adminEmail,
    template: renderHousingAdminReviewRequiredEmail(input),
    replyTo: input.clientEmail,
    context: "housing administrative review required for admin",
  });
}
