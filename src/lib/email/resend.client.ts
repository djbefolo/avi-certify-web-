import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;
let hasLoggedMissingApiKey = false;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (!hasLoggedMissingApiKey) {
      console.info(
        "[email] RESEND_API_KEY is not configured. Transactional emails are skipped.",
      );
      hasLoggedMissingApiKey = true;
    }

    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}
