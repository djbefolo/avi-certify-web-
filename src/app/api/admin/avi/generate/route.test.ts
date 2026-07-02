import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const generateAndStoreManualAvi = vi.hoisted(() => vi.fn());

vi.mock("@/lib/avi/manual-avi-pdf.service", () => ({
  generateAndStoreManualAvi,
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/avi/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  studentFullName: "Awa Student",
  studentEmail: "awa@example.com",
  destinationCountry: "France",
  originCountry: "Cameroun",
  aviAmount: 7420,
  currency: "EUR",
  academicYear: "2026-2027",
  issueDate: "2026-07-02",
  aviReference: "AVI-FR-26-CMR-01-00001011",
  notesForAdmin: "Internal note only.",
};

describe("/api/admin/avi/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateAndStoreManualAvi.mockResolvedValue({
      generated: true,
      reference: "AVI-FR-26-CMR-01-00001011",
      documentId: "AVI-FR-26-CMR-01-00001011",
      aviNumberDisplay: "AVI/FR/26/CMR/01/00001011",
      verificationCode: "AVI-FR-26-CMR-01-00001011",
      verificationUrl: "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00001011",
      storagePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.pdf",
      htmlStoragePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.html",
      downloadUrl: "/api/admin/avi/AVI-FR-26-CMR-01-00001011/download",
      templateName: "avi-certificate-europe-france.html",
      templateKey: "EUROPE_FRANCE",
      pdfTemplateTitle: "ATTESTATION DE VIREMENT IRREVOCABLE",
      pdfGenerationEngine: "chromium-html",
      size: 1024,
    });
  });

  it("requires admin authentication", async () => {
    const response = await POST(
      request(validPayload, { "x-admin-dev-token": "" }),
    );

    expect(response.status).toBe(401);
    expect(generateAndStoreManualAvi).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads before generation", async () => {
    const response = await POST(
      request({
        studentFullName: "",
        aviAmount: 7420,
        academicYear: "2026-2027",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Payload AVI invalide.");
    expect(generateAndStoreManualAvi).not.toHaveBeenCalled();
  });

  it("rejects invalid amounts", async () => {
    const response = await POST(
      request({
        studentFullName: "Awa Student",
        aviAmount: -10,
        academicYear: "2026-2027",
      }),
    );

    expect(response.status).toBe(400);
    expect(generateAndStoreManualAvi).not.toHaveBeenCalled();
  });

  it("rejects oversized payloads", async () => {
    const response = await POST(
      request(validPayload, { "content-length": "20000" }),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toMatch(/trop volumineuse/i);
    expect(generateAndStoreManualAvi).not.toHaveBeenCalled();
  });

  it("stores an official AVI and returns verification metadata", async () => {
    const response = await POST(request(validPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-avi-reference")).toBe("AVI-FR-26-CMR-01-00001011");
    expect(generateAndStoreManualAvi).toHaveBeenCalledWith({
      actor: expect.objectContaining({ uid: "local-admin" }),
      payload: expect.objectContaining({
        studentFullName: "Awa Student",
        aviAmount: 7420,
        notesForAdmin: "Internal note only.",
      }),
    });
    expect(body).toMatchObject({
      generated: true,
      reference: "AVI-FR-26-CMR-01-00001011",
      verificationUrl: "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00001011",
      storagePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.pdf",
      downloadUrl: "/api/admin/avi/AVI-FR-26-CMR-01-00001011/download",
      pdfGenerationEngine: "chromium-html",
    });
  });
});

