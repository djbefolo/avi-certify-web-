import "server-only";

const defaultSenderName = "AVI CERTIFY";
const defaultFromEmail = "AVI CERTIFY <onboarding@resend.dev>";

export type EmailConfig = {
  senderName: string;
  fromEmail: string;
  adminEmail: string | null;
  replyTo: string | null;
};

function normalizeOptionalEmail(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

export function getEmailConfig(): EmailConfig {
  const fromEmail = normalizeOptionalEmail(process.env.RESEND_FROM_EMAIL);
  const adminEmail = normalizeOptionalEmail(process.env.ADMIN_NOTIFICATION_EMAIL);

  return {
    senderName: defaultSenderName,
    fromEmail: fromEmail ?? defaultFromEmail,
    adminEmail,
    replyTo: fromEmail,
  };
}
