import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import type { HousingCertificateTemplateData } from "@/lib/certificates/housing-certificate-template";
import { getAdminStorage } from "@/lib/firebase/admin";

const templateFileName = "housing-certificate-france.html";
const signatureStampStoragePath = "internal-assets/certificates/president-signature-stamp.png";
const logoAssetPath = "public/assets/photos/avi-certify-logo.png";
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const rawTemplateFields = new Set(["logoDataUrl", "qrCodeDataUrl", "signatureStampMarkup"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: unknown) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function formatCertificateDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export function formatHousingCertificateRent(rent: number) {
  const hasCentimes = Math.round(rent * 100) % 100 !== 0;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: hasCentimes ? 2 : 0,
    maximumFractionDigits: hasCentimes ? 2 : 0,
  }).format(rent);
}

function getVerificationCode(certificateReference: string) {
  const value = cleanString(certificateReference);
  if (!value) {
    throw new Error("HOUSING_CERTIFICATE_REFERENCE_MISSING");
  }
  return value;
}

function isSafeImageDataUrl(value: string) {
  return /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value);
}

async function loadLogoDataUrl() {
  try {
    const asset = await readFile(path.join(process.cwd(), logoAssetPath));
    if (!isPng(asset)) {
      throw new Error("HOUSING_CERTIFICATE_LOGO_NOT_PNG");
    }
    return `data:image/png;base64,${asset.toString("base64")}`;
  } catch (error) {
    if (error instanceof Error && error.message === "HOUSING_CERTIFICATE_LOGO_NOT_PNG") {
      throw error;
    }
    throw new Error("HOUSING_CERTIFICATE_LOGO_NOT_FOUND");
  }
}

async function loadTemplate() {
  return readFile(
    path.join(process.cwd(), "src", "lib", "certificates", "templates", templateFileName),
    "utf8",
  );
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (placeholder, key: string) => {
    if (!(key in values)) {
      throw new Error(`HOUSING_CERTIFICATE_TEMPLATE_VALUE_MISSING:${key}`);
    }
    return rawTemplateFields.has(key) ? values[key] : escapeHtml(values[key]);
  });
}

function buildSignatureStampMarkup(signatureDataUrl: string) {
  if (!signatureDataUrl) return "";
  if (!isSafeImageDataUrl(signatureDataUrl)) {
    throw new Error("HOUSING_CERTIFICATE_SIGNATURE_STAMP_INVALID");
  }

  return `<img class="signature-stamp" src="${escapeAttribute(signatureDataUrl)}" alt="Signature electronique AVI CERTIFY" />`;
}

function isPng(buffer: Buffer) {
  return buffer.byteLength >= pngSignature.byteLength && buffer.subarray(0, 8).equals(pngSignature);
}

async function loadPrivateSignatureStampDataUrl() {
  try {
    const [buffer] = await getAdminStorage()
      .bucket()
      .file(signatureStampStoragePath)
      .download();
    if (!isPng(buffer)) {
      throw new Error("HOUSING_CERTIFICATE_SIGNATURE_STAMP_NOT_PNG");
    }
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("[housing-certificate-pdf] Private signature stamp unavailable", {
      code: error instanceof Error ? error.message : "unknown_error",
    });
    return "";
  }
}

async function getSignatureStampMarkup() {
  const privateSignatureDataUrl = await loadPrivateSignatureStampDataUrl();
  if (privateSignatureDataUrl) {
    return buildSignatureStampMarkup(privateSignatureDataUrl);
  }

  return buildSignatureStampMarkup(
    cleanString(process.env.HOUSING_CERTIFICATE_SIGNATURE_STAMP_DATA_URL),
  );
}

export async function renderHousingCertificateHtml(data: HousingCertificateTemplateData) {
  if (!cleanString(data.verificationUrl)) {
    throw new Error("HOUSING_CERTIFICATE_VERIFICATION_URL_MISSING");
  }
  if (!Number.isFinite(data.housing.monthlyRent) || data.housing.monthlyRent < 0) {
    throw new Error("HOUSING_CERTIFICATE_RENT_INVALID");
  }

  const [template, logoDataUrl, qrCodeDataUrl, signatureStampMarkup] = await Promise.all([
    loadTemplate(),
    loadLogoDataUrl(),
    QRCode.toDataURL(data.verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    }),
    getSignatureStampMarkup(),
  ]);
  const validUntil = cleanString(data.validUntil) || "date à confirmer";
  const html = renderTemplate(template, {
    certificateReference: data.certificateReference,
    certificateStatus: data.certificateStatus,
    expectedArrivalDate: data.expectedArrivalDate,
    expectedStayDurationMonths: String(data.expectedStayDurationMonths),
    housingAddress: data.housing.addressLine,
    housingCity: data.housing.city,
    housingPostalCode: data.housing.postalCode,
    issuedAt: data.issuedAt,
    logoDataUrl,
    monthlyRent: formatHousingCertificateRent(data.housing.monthlyRent),
    qrCodeDataUrl,
    signatureStampMarkup,
    studentDateOfBirth: data.studentDateOfBirth,
    studentFullName: data.studentFullName,
    studentNationality: data.studentNationality,
    studentPlaceOfBirth: data.studentPlaceOfBirth,
    validUntil,
    verificationCode: getVerificationCode(data.certificateReference),
  });

  if (/\{\{[a-zA-Z0-9_]+\}\}/.test(html)) {
    throw new Error("HOUSING_CERTIFICATE_TEMPLATE_UNRESOLVED_PLACEHOLDER");
  }
  return html;
}

export async function renderHousingCertificatePdfFromHtml(html: string) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      defaultViewport: { width: 794, height: 1123, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.emulateMediaType("print");
    await page.evaluate(
      "document.fonts && document.fonts.ready ? document.fonts.ready.then(function() {}) : Promise.resolve()",
    );
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
      printBackground: true,
    });
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } catch (error) {
    console.error("[housing-certificate-pdf] Chromium rendering failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    throw new Error("HOUSING_CERTIFICATE_PDF_RENDER_FAILED");
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export async function generateHousingCertificatePdf(data: HousingCertificateTemplateData) {
  return renderHousingCertificatePdfFromHtml(await renderHousingCertificateHtml(data));
}

export function getDefaultCertificateDates(now = new Date()) {
  const entryDate = new Date(now);
  entryDate.setMonth(entryDate.getMonth() + 1);
  return {
    issueDate: formatCertificateDate(now),
    entryDate: formatCertificateDate(entryDate),
  };
}
