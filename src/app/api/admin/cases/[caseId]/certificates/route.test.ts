import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const generateHousingCertificateForCase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/certificates/certificate-workflow.service", () => ({
  generateHousingCertificateForCase,
}));

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/cases/case-1/certificates", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
    },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ caseId: "case-1" }) };

describe("admin case certificates route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateHousingCertificateForCase.mockResolvedValue({
      generated: true,
      certificateId: "case-1-housing-certificate",
      certificateNumber: "AVI-HBG-2026-CASE1",
      verificationUrl: "https://www.avicertify.fr/verifier/token-1",
      message: "Attestation generee.",
      email: { sent: true, status: "SENT", messageId: "email-1", provider: "resend" },
    });
  });

  it("generates an accommodation certificate with the authenticated admin actor", async () => {
    const response = await POST(
      request({ certificateType: "accommodation_certificate" }),
      context,
    );

    expect(response.status).toBe(200);
    expect(generateHousingCertificateForCase).toHaveBeenCalledWith({
      caseId: "case-1",
      actor: expect.objectContaining({ uid: "local-admin" }),
      housingRegion: null,
    });
  });

  it("rejects unsupported certificate types before generation", async () => {
    const response = await POST(request({ certificateType: "quote_pdf" }), context);

    expect(response.status).toBe(500);
    expect(generateHousingCertificateForCase).not.toHaveBeenCalled();
  });

  it("returns an explicit business result when generation is blocked", async () => {
    generateHousingCertificateForCase.mockResolvedValueOnce({
      generated: false,
      reason: "missing_profile_data",
      certificateId: "case-1-housing-certificate",
      certificateNumber: null,
      verificationUrl: null,
      message: "Generation bloquee : profil incomplet (date de naissance).",
      missingProfileFields: ["dateOfBirth"],
      missingFieldLabels: ["date de naissance"],
      email: {
        sent: false,
        status: "RECIPIENT_MISSING",
        messageId: null,
        provider: "resend",
      },
    });

    const response = await POST(
      request({ certificateType: "accommodation_certificate" }),
      context,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      generated: false,
      reason: "missing_profile_data",
      message: "Generation bloquee : profil incomplet (date de naissance).",
      missingFieldLabels: ["date de naissance"],
    });
  });
});
