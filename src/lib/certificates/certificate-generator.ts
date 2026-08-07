import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import type { HousingCertificateTemplateData } from "@/lib/certificates/housing-certificate-template";
import { getAdminStorage } from "@/lib/firebase/admin";

const templateFileName = "housing-certificate-france.html";
const templateVersion = "housing-conditional-v4";
const signatureStampStoragePath = "internal-assets/certificates/president-signature-stamp.png";
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const logoAssetCandidates = [
  "public/assets/photos/avi-certify-logo.png",
  "public/assets/photos/logo_avi_certify.png",
  "public/assets/avi-certify-logo.png",
  "public/avi-certify-logo.png",
  "public/logo.png",
];
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

function formatRent(rent: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(rent);
}

function isSafeImageDataUrl(value: string) {
  return /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value);
}

async function loadDataUrl(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      const asset = await readFile(path.join(process.cwd(), candidate));
      return `data:image/png;base64,${asset.toString("base64")}`;
    } catch {
      // Continue only through known server-side logo paths.
    }
  }

  throw new Error("HOUSING_CERTIFICATE_LOGO_NOT_FOUND");
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

function getSchoolStatement(targetSchoolName: string | null) {
  return targetSchoolName
    ? `Etablissement vise : ${targetSchoolName}.`
    : "L'etablissement d'enseignement vise est en cours de confirmation dans le dossier.";
}

export async function renderHousingCertificateHtml(data: HousingCertificateTemplateData) {
  if (!cleanString(data.verificationUrl)) {
    throw new Error("HOUSING_CERTIFICATE_VERIFICATION_URL_MISSING");
  }
  if (!Number.isFinite(data.housing.rent) || data.housing.rent < 0) {
    throw new Error("HOUSING_CERTIFICATE_RENT_INVALID");
  }

  const [template, logoDataUrl, qrCodeDataUrl, signatureStampMarkup] = await Promise.all([
    loadTemplate(),
    loadDataUrl(logoAssetCandidates),
    QRCode.toDataURL(data.verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    }),
    getSignatureStampMarkup(),
  ]);
  const validUntil = cleanString(data.validUntil) || "date a confirmer";
  const html = renderTemplate(template, {
    certificateNumber: data.certificateNumber,
    dateOfBirth: data.dateOfBirth,
    birthPlace: data.birthPlace,
    durationMonths: String(data.durationMonths),
    entryDate: data.entryDate,
    housingAddress: data.housing.fullAddress,
    housingCity: data.housing.city,
    housingRent: formatRent(data.housing.rent),
    issueDate: data.issueDate,
    logoDataUrl,
    nationality: data.nationality,
    qrCodeDataUrl,
    schoolStatement: getSchoolStatement(data.targetSchoolName),
    signatureStampMarkup,
    studentFullName: data.studentFullName,
    templateVersion: data.templateVersion ?? templateVersion,
    validUntil,
  });

  if (/\{\{[a-zA-Z0-9_]+\}\}/.test(html)) {
    throw new Error("HOUSING_CERTIFICATE_TEMPLATE_UNRESOLVED_PLACEHOLDER");
  }
  return html;
}

async function renderHtmlToPdfBuffer(html: string) {
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
  return renderHtmlToPdfBuffer(await renderHousingCertificateHtml(data));
}

export function getDefaultCertificateDates(now = new Date()) {
  const entryDate = new Date(now);
  entryDate.setMonth(entryDate.getMonth() + 1);
  return {
    issueDate: formatCertificateDate(now),
    entryDate: formatCertificateDate(entryDate),
  };
}
