import { describe, expect, it } from "vitest";
import {
  getCertificateSummaryFromDocuments,
  getRequiredDocumentSummaryFromDocuments,
} from "@/lib/dashboard/dashboard-data.service";
import type { UserDocument } from "@/types/document";

function documentFixture(
  overrides: Partial<UserDocument> & Pick<UserDocument, "id" | "documentType" | "status">,
): UserDocument {
  return {
    ownerId: "client-1",
    originalFileName: "document.pdf",
    safeFileName: "document.pdf",
    contentType: "application/pdf",
    size: 1024,
    storagePath: "users/client-1/documents/internal-path.pdf",
    certificateId: null,
    certificateNumber: null,
    verificationUrl: null,
    createdAt: new Date("2026-06-01T08:00:00.000Z"),
    updatedAt: new Date("2026-06-01T08:00:00.000Z"),
    ...overrides,
  };
}

describe("dashboard document summaries", () => {
  it("returns empty required documents as missing without fake validation", () => {
    const documents = getRequiredDocumentSummaryFromDocuments([]);

    expect(documents).toHaveLength(3);
    expect(documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "passport",
          status: "missing",
          workflowStatus: "missing",
        }),
      ]),
    );
    expect(documents).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "approved" })]),
    );
  });

  it("maps requested, uploaded, and approved documents from real document rows", () => {
    const documents = getRequiredDocumentSummaryFromDocuments([
      documentFixture({
        id: "passport-request",
        documentType: "passport",
        status: "requested",
      }),
      documentFixture({
        id: "admission-upload",
        documentType: "admission_letter",
        status: "uploaded",
      }),
      documentFixture({
        id: "bank-approved",
        documentType: "bank_statement",
        status: "approved",
      }),
    ]);

    expect(documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "passport",
          status: "missing",
          workflowStatus: "missing",
        }),
        expect.objectContaining({
          id: "admission_letter",
          status: "pending_review",
          workflowStatus: "uploaded",
        }),
        expect.objectContaining({
          id: "financial_proof",
          status: "approved",
          workflowStatus: "approved",
        }),
      ]),
    );
  });

  it("uses the latest document status for a required document type", () => {
    const documents = getRequiredDocumentSummaryFromDocuments([
      documentFixture({
        id: "passport-old",
        documentType: "passport",
        status: "approved",
        updatedAt: new Date("2026-05-01T08:00:00.000Z"),
      }),
      documentFixture({
        id: "passport-new",
        documentType: "passport",
        status: "rejected",
        updatedAt: new Date("2026-06-01T08:00:00.000Z"),
      }),
    ]);

    expect(documents.find((item) => item.id === "passport")).toEqual(
      expect.objectContaining({
        status: "rejected",
        workflowStatus: "rejected",
      }),
    );
  });

  it("exposes only public certificate metadata", () => {
    const certificate = getCertificateSummaryFromDocuments([
      documentFixture({
        id: "certificate-1",
        documentType: "accommodation_certificate",
        status: "generated",
        originalFileName: "attestation-hebergement.pdf",
        certificateNumber: "AVI-2026-001",
        verificationUrl: "https://www.avicertify.fr/verifier/token-1",
      }),
    ]);

    expect(certificate).toEqual({
      available: true,
      title: "attestation-hebergement.pdf",
      description:
        "Une attestation generee est disponible. Seul le numero public et le lien de verification sont affiches ici.",
      certificateNumber: "AVI-2026-001",
      verificationUrl: "https://www.avicertify.fr/verifier/token-1",
    });
    expect(certificate).not.toHaveProperty("storagePath");
  });

  it("does not expose arbitrary certificate verification URLs", () => {
    const certificate = getCertificateSummaryFromDocuments([
      documentFixture({
        id: "certificate-1",
        documentType: "accommodation_certificate",
        status: "generated",
        certificateNumber: "AVI-2026-001",
        verificationUrl: "https://example.com/private-download",
      }),
    ]);

    expect(certificate.available).toBe(true);
    expect(certificate.verificationUrl).toBeNull();
  });
});
