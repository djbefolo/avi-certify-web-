import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const pdfMocks = vi.hoisted(() => {
  const page = {
    setDefaultNavigationTimeout: vi.fn(),
    setContent: vi.fn(),
    emulateMediaType: vi.fn(),
    evaluate: vi.fn(),
    pdf: vi.fn(),
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
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const download = vi.fn().mockResolvedValue([signature]);
  const file = vi.fn(() => ({ download }));
  const bucket = vi.fn(() => ({ file }));
  return { bucket, download, file, signature };
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

const templateDirectory = path.join(process.cwd(), "src", "lib", "certificates", "templates");
const canonicalTemplatePath = path.join(templateDirectory, "housing-certificate-france.html");

const testCertificate = {
  certificateReference: "AVI-HBG-2026-CASETYFI",
  certificateStatus: "CONDITIONNELLE",
  studentFullName: "Cécile Gaelle EYENGA",
  studentDateOfBirth: "8 juin 1988",
  studentPlaceOfBirth: "Yaoundé",
  studentNationality: "Camerounaise",
  housing: {
    city: "Rennes",
    addressLine: "4 rue d’Alsace",
    postalCode: "35000",
    monthlyRent: 610,
  },
  expectedArrivalDate: "1 septembre 2026",
  expectedStayDurationMonths: 12,
  issuedAt: "10 août 2026",
  validUntil: "9 septembre 2026",
  verificationUrl: "https://www.avicertify.fr/verifier/test-token-1234567890",
};

function normalizedText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

describe("conditional housing certificate PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produces exactly one A4 PDF page from fully rendered HTML", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([595.28, 841.89]);
    pdfMocks.page.pdf.mockResolvedValueOnce(await pdf.save());

    const buffer = await generateHousingCertificatePdf(testCertificate);
    const renderedPdf = await PDFDocument.load(Uint8Array.from(buffer));
    const [page] = renderedPdf.getPages();
    const htmlPassedToChromium = pdfMocks.page.setContent.mock.calls[0]?.[0] as string;

    expect(renderedPdf.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
    expect(htmlPassedToChromium).toContain("ATTESTATION CONDITIONNELLE DE LOGEMENT");
    expect(htmlPassedToChromium).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
    expect(pdfMocks.page.pdf).toHaveBeenCalledWith(
      expect.objectContaining({ format: "A4", preferCSSPageSize: true }),
    );
  });

  it("renders the validated historical content with the complete test dossier", async () => {
    const canonicalLogo = await readFile(
      path.join(process.cwd(), "public", "assets", "photos", "avi-certify-logo.png"),
    );
    const html = await renderHousingCertificateHtml(testCertificate);
    const text = normalizedText(html);
    const imageSources = html.match(/src="data:image\/png;base64,[^"]+"/g) ?? [];

    expect(text).toContain("Je soussigné, BEFOLO NKOA Gabriel Emmanuel");
    expect(text).toContain(
      "AVI CERTIFY est une société spécialisée dans l’accompagnement des étudiants internationaux dans leurs démarches administratives, financières et leur installation en France.",
    );
    expect(text).toContain(
      "Nous restons à votre disposition pour tout complément d’information. Ce document est strictement personnel, vérifiable par QR code et ne peut être revendu.",
    );
    expect(text).toContain("Cécile Gaelle EYENGA");
    expect(text).toContain("8 juin 1988");
    expect(text).toContain("Yaoundé");
    expect(text).toContain("Camerounaise");
    expect(text).toContain("4 rue d’Alsace, 35000 Rennes");
    expect(text).toContain("610 EUR");
    expect(text).toContain("1 septembre 2026");
    expect(text).toContain("12 mois");
    expect(html).toContain(`data:image/png;base64,${canonicalLogo.toString("base64")}`);
    expect(html).toContain(
      `data:image/png;base64,${signatureStorageMocks.signature.toString("base64")}`,
    );
    expect(imageSources).toHaveLength(3);
    expect(html).toContain('class="qr" src="data:image/png;base64,');
    expect(html).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
    expect(signatureStorageMocks.file).toHaveBeenCalledWith(
      "internal-assets/certificates/president-signature-stamp.png",
    );
  });

  it("has one canonical template with the canonical placeholder contract", async () => {
    const templateFiles = (await readdir(templateDirectory)).filter((name) =>
      name.startsWith("housing-certificate-france"),
    );
    const template = await readFile(canonicalTemplatePath, "utf8");
    const placeholders = [
      ...new Set(
        [...template.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((match) => match[1]),
      ),
    ].sort();

    expect(templateFiles).toEqual(["housing-certificate-france.html"]);
    expect(placeholders).toEqual(
      [
        "certificateReference",
        "certificateStatus",
        "expectedArrivalDate",
        "expectedStayDurationMonths",
        "housingAddress",
        "housingCity",
        "housingPostalCode",
        "issuedAt",
        "logoDataUrl",
        "monthlyRent",
        "qrCodeDataUrl",
        "signatureStampMarkup",
        "studentDateOfBirth",
        "studentFullName",
        "studentNationality",
        "studentPlaceOfBirth",
        "validUntil",
        "verificationCode",
      ].sort(),
    );
    expect(template).toContain("Je soussigné");
    expect(template).not.toContain("BÉNÉFICIAIRE");
    expect(template).not.toContain("B&eacute;n&eacute;ficiaire");
    expect(template).not.toContain("SOLUTION DE LOGEMENT CONDITIONNELLE");
    expect(template).not.toContain("Solution de logement conditionnelle");
    expect(template).not.toContain("schoolStatement");
    expect(template).not.toContain(";base64,");
  });
});
