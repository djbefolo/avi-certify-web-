import { describe, expect, it, vi } from "vitest";

const pdfMocks = vi.hoisted(() => {
  const page = {
    setDefaultNavigationTimeout: vi.fn(),
    setContent: vi.fn(),
    emulateMediaType: vi.fn(),
    evaluate: vi.fn(),
    pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-housing-certificate\n%%EOF")),
  };
  return {
    executablePath: vi.fn().mockResolvedValue("/opt/chromium"),
    defaultArgs: vi.fn().mockResolvedValue(["--no-sandbox"]),
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(page),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    page,
  };
});

const signatureStorageMocks = vi.hoisted(() => {
  const download = vi.fn().mockResolvedValue([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  ]);
  const file = vi.fn(() => ({ download }));
  const bucket = vi.fn(() => ({ file }));
  return { bucket, download, file };
});

vi.mock("@sparticuz/chromium", () => ({
  default: { args: ["--single-process"], executablePath: pdfMocks.executablePath },
}));

vi.mock("puppeteer-core", () => ({
  default: { defaultArgs: pdfMocks.defaultArgs, launch: pdfMocks.launch },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorage: () => ({ bucket: signatureStorageMocks.bucket }),
}));

import {
  generateHousingCertificatePdf,
  renderHousingCertificateHtml,
} from "@/lib/certificates/certificate-generator";

describe("conditional housing certificate PDF", () => {
  it("builds a readable PDF with the repository AVI CERTIFY logo and QR code", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const buffer = await generateHousingCertificatePdf({
      certificateNumber: "AVI-HBG-2026-CASE0001",
      studentFullName: "Awa Student",
      dateOfBirth: "3 fevrier 2001",
      birthPlace: "Douala",
      nationality: "Camerounaise",
      targetSchoolName: "Universite test",
      housing: {
        city: "Paris",
        fullAddress: "1 rue Test, 75000 Paris",
        rent: 500,
      },
      entryDate: "1 septembre 2026",
      durationMonths: 12,
      issueDate: "3 aout 2026",
      validUntil: "30 septembre 2026",
      verificationUrl: "https://www.avicertify.fr/verifier/test-token-1234567890",
      templateVersion: "housing-conditional-v4",
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(10);
    expect(buffer.toString("latin1")).toContain("%%EOF");
    expect(pdfMocks.launch).toHaveBeenCalledTimes(1);
    expect(pdfMocks.page.setContent).toHaveBeenCalledWith(
      expect.stringContaining("ATTESTATION CONDITIONNELLE DE LOGEMENT"),
      expect.anything(),
    );
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it("renders the administrative template from a frozen certificate payload", async () => {
    const html = await renderHousingCertificateHtml({
      certificateNumber: "AVI-HBG-2026-CASE0001",
      studentFullName: "Awa Student",
      dateOfBirth: "3 fevrier 2001",
      birthPlace: "Douala",
      nationality: "Camerounaise",
      targetSchoolName: "Universite test",
      housing: { city: "Paris", fullAddress: "1 rue Test, 75000 Paris", rent: 500 },
      entryDate: "1 septembre 2026",
      durationMonths: 12,
      issueDate: "3 aout 2026",
      validUntil: "30 septembre 2026",
      verificationUrl: "https://www.avicertify.fr/verifier/test-token-1234567890",
      templateVersion: "housing-conditional-v4",
    });

    expect(html).toContain("ATTESTATION CONDITIONNELLE DE LOGEMENT");
    expect(html).toContain("Awa Student");
    expect(html).toContain("1 rue Test, 75000 Paris");
    expect(html).toContain("data:image/png;base64,");
    expect(html).toContain('class="signature-stamp"');
    expect(html).toContain(".header { position: relative;");
    expect(html).toContain("margin: 0 auto; object-fit: contain; object-position: center;");
    expect(html).toContain(".reference { position: absolute; top: 0; right: 0; width: 52mm;");
    expect(html).not.toContain("BEFOLO NKOA Gabriel");
    expect(html).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
    expect(signatureStorageMocks.file).toHaveBeenCalledWith(
      "internal-assets/certificates/president-signature-stamp.png",
    );
    expect(signatureStorageMocks.download).toHaveBeenCalled();
  });
});
