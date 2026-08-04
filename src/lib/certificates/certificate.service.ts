import "server-only";

import { getPublicCertificateVerificationByToken } from "@/lib/certificates/certificate-workflow.service";

/**
 * Compatibility boundary for the former payment-inline generator.
 * Payment webhooks now persist one document_generation_job and never build PDFs inline.
 */
export async function generateHousingCertificateForPaidPayment() {
  return {
    generated: false,
    reason: "generation_job_required" as const,
  };
}

export async function getCertificateVerificationByToken(token: string) {
  const certificate = await getPublicCertificateVerificationByToken(token);
  return certificate ? { id: certificate.id, data: certificate } : null;
}
