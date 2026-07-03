import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import chromium from "@sparticuz/chromium";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import type { ManualAviPayload } from "@/lib/validations/avi";

const verifyBaseUrl = (
  process.env.NEXT_PUBLIC_AVI_VERIFY_BASE_URL ||
  process.env.VERIFICATION_BASE_URL ||
  "https://verify.avicertify.fr"
).replace(/\/+$/, "");

const templateEuropeFrance = "avi-certificate-europe-france.html";
const templateCanada = "avi-certificate-canada.html";
const templatesDir = path.join(process.cwd(), "src", "lib", "avi", "templates");
const optionalTemplateFields = new Set(["signatureStampDataUrl"]);

const europeCountryCodes = new Set([
  "FR",
  "BE",
  "CH",
  "DE",
  "ES",
  "IT",
  "PT",
  "NL",
  "LU",
  "IE",
  "AT",
  "PL",
  "CZ",
  "SE",
  "NO",
  "DK",
  "FI",
]);

const destinationCodeByName: Record<string, string> = {
  france: "FR",
  belgique: "BE",
  suisse: "CH",
  allemagne: "DE",
  espagne: "ES",
  italie: "IT",
  portugal: "PT",
  "pays bas": "NL",
  netherlands: "NL",
  luxembourg: "LU",
  irlande: "IE",
  autriche: "AT",
  pologne: "PL",
  "republique tcheque": "CZ",
  "république tchèque": "CZ",
  suede: "SE",
  suède: "SE",
  norvege: "NO",
  norvège: "NO",
  danemark: "DK",
  finlande: "FI",
  canada: "CA",
};

const countryNameByCode: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  CH: "Suisse",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  PT: "Portugal",
  NL: "Pays-Bas",
  LU: "Luxembourg",
  IE: "Irlande",
  AT: "Autriche",
  PL: "Pologne",
  CZ: "Republique tcheque",
  SE: "Suede",
  NO: "Norvege",
  DK: "Danemark",
  FI: "Finlande",
  CA: "Canada",
  CMR: "Cameroun",
};

const departureCodeByName: Record<string, string> = {
  cameroun: "CMR",
  cameroon: "CMR",
  senegal: "SEN",
  "sénégal": "SEN",
  coteivoire: "CIV",
  "cote d ivoire": "CIV",
  "côte d ivoire": "CIV",
  "côte d'ivoire": "CIV",
  "cote d'ivoire": "CIV",
  benin: "BEN",
  "bénin": "BEN",
  togo: "TGO",
  mali: "MLI",
  guinee: "GIN",
  "guinée": "GIN",
  gabon: "GAB",
  congo: "COG",
};

type TemplateKey = "EUROPE_FRANCE" | "CANADA";
type TemplateInfo = {
  html: string;
  placeholders: string[];
};
type AviIdentifiers = {
  destinationCountryCode: string;
  departureCountryCode: string;
  issueYearShort: string;
  seriesCode: string;
  sequenceNumber: number;
  sequenceNumberPadded: string;
  aviNumberDisplay: string;
  verificationCode: string;
  verificationUrl: string;
  counterKey: string;
};
export type ManualAviGenerationResult = {
  generated: true;
  reference: string;
  documentId: string;
  aviNumberDisplay: string;
  verificationCode: string;
  verificationUrl: string;
  storagePath: string;
  htmlStoragePath: string;
  downloadUrl: string;
  templateName: string;
  templateKey: TemplateKey;
  pdfTemplateTitle: string;
  pdfGenerationEngine: "chromium-html";
  size: number;
};

const templateCache = new Map<string, TemplateInfo>();

function cleanString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return trimmed || fallback;
}

function firstDefined<T>(...values: Array<T | null | undefined>) {
  return values.find((value) => value !== undefined && value !== null);
}

function normalizeLookupKey(value: unknown) {
  return cleanString(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCode(value: unknown, maxLength: number) {
  const code = cleanString(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code || code.length > maxLength) return "";
  return code;
}

function inferDestinationCountryCode(value: unknown) {
  const directCode = normalizeCode(value, 2);
  if (directCode.length === 2 && (europeCountryCodes.has(directCode) || directCode === "CA")) {
    return directCode;
  }

  return destinationCodeByName[normalizeLookupKey(value)] ?? "";
}

function inferDepartureCountryCode(value: unknown) {
  const directCode = normalizeCode(value, 4);
  if (directCode.length >= 2) return directCode;

  return departureCodeByName[normalizeLookupKey(value)] ?? "";
}

function getCountryName(code: string, fallback = "") {
  return countryNameByCode[code] ?? cleanString(fallback, code);
}

function getIssueYearShort(date: Date) {
  return String(date.getUTCFullYear() % 100).padStart(2, "0");
}

function normalizeSeriesCode(value: unknown) {
  let code = normalizeCode(firstDefined(value, "01"), 8);
  if (!code) code = "01";
  if (/^\d+$/.test(code)) code = code.padStart(2, "0");
  return code;
}

function padSequenceNumber(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Invalid AVI sequence number.");
  }

  return String(value).padStart(8, "0");
}

function parseDateLike(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const raw = cleanString(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== originalDay) result.setUTCDate(0);
  return result;
}

function formatDateFr(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNumberFr(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: Number.isInteger(number) ? 0 : 2,
  }).format(number);
}

function buildVerificationUrl(id: string) {
  return `${verifyBaseUrl}/${encodeURIComponent(id)}`;
}

function escapeHtml(value: unknown) {
  return cleanString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadTemplateInfo(templateName: string) {
  const cached = templateCache.get(templateName);
  if (cached) return cached;

  const html = await readFile(path.join(templatesDir, templateName), "utf8");
  const placeholders = Array.from(
    new Set(Array.from(html.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g), (match) => match[1])),
  ).sort();
  const info = { html, placeholders };
  templateCache.set(templateName, info);
  return info;
}

function renderTemplate(html: string, values: Record<string, unknown>) {
  return html.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    if (key === "qrCodeDataUrl" || key === "signatureStampDataUrl") {
      return cleanString(values[key]);
    }

    return escapeHtml(values[key]);
  });
}

function hasTemplateValue(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  return cleanString(value) !== "";
}

async function validateTemplateValues(templateName: string, values: Record<string, unknown>) {
  const { placeholders } = await loadTemplateInfo(templateName);
  const missing = placeholders.filter((key) => {
    return !optionalTemplateFields.has(key) && !hasTemplateValue(values[key]);
  });
  if (missing.length) {
    throw new Error(`Champs obligatoires manquants pour ${templateName}: ${missing.join(", ")}.`);
  }
}

function selectAviTemplate(data: ManualAviPayload & Partial<AviIdentifiers>) {
  const destinationCountryCode =
    data.destinationCountryCode ?? inferDestinationCountryCode(data.destinationCountry);
  if (destinationCountryCode === "CA") {
    return { destinationCountryCode, templateName: templateCanada, templateKey: "CANADA" as const };
  }
  if (europeCountryCodes.has(destinationCountryCode)) {
    return {
      destinationCountryCode,
      templateName: templateEuropeFrance,
      templateKey: "EUROPE_FRANCE" as const,
    };
  }

  throw new Error(`Aucun template AVI officiel configure pour ${destinationCountryCode || data.destinationCountry}.`);
}

function officialPdfTemplateTitle(templateKey: TemplateKey) {
  return templateKey === "CANADA"
    ? "ATTESTATION DE SOUTIEN FINANCIER ETUDIANT"
    : "ATTESTATION DE VIREMENT IRREVOCABLE";
}

function valueString(...values: unknown[]) {
  return cleanString(firstDefined(...values));
}

function destinationAmountFields(payload: ManualAviPayload, templateKey: TemplateKey) {
  const monthlyAmount = payload.aviAmount / 12;
  const currency = payload.currency.toUpperCase();
  const xafAmount = currency === "XAF" ? payload.aviAmount : payload.aviAmount;
  const destinationAmount = currency === "XAF" ? payload.aviAmount : payload.aviAmount;
  const monthlyXafAmount = xafAmount / 12;
  const amountXafFormatted = formatNumberFr(xafAmount);
  const monthlyXafFormatted = formatNumberFr(monthlyXafAmount);
  const amountDestinationFormatted = formatNumberFr(destinationAmount);
  const monthlyDestinationFormatted = formatNumberFr(monthlyAmount);

  return {
    amountXaf: amountXafFormatted,
    amountXafFormatted,
    amountXafWords: amountXafFormatted,
    monthlyXaf: monthlyXafAmount,
    monthlyXafFormatted,
    monthlyXafWords: monthlyXafFormatted,
    monthlyAmountXaf: monthlyXafFormatted,
    monthlyAmountXafWords: monthlyXafFormatted,
    amountEur: templateKey === "EUROPE_FRANCE" ? amountDestinationFormatted : undefined,
    amountEurFormatted: templateKey === "EUROPE_FRANCE" ? amountDestinationFormatted : "",
    amountEurWords: templateKey === "EUROPE_FRANCE" ? amountDestinationFormatted : "",
    monthlyEur: templateKey === "EUROPE_FRANCE" ? monthlyAmount : undefined,
    monthlyEurFormatted: templateKey === "EUROPE_FRANCE" ? monthlyDestinationFormatted : "",
    monthlyEurWords: templateKey === "EUROPE_FRANCE" ? monthlyDestinationFormatted : "",
    monthlyAmountEur: templateKey === "EUROPE_FRANCE" ? monthlyDestinationFormatted : "",
    monthlyAmountEurWords: templateKey === "EUROPE_FRANCE" ? monthlyDestinationFormatted : "",
    amountCad: templateKey === "CANADA" ? destinationAmount : undefined,
    amountCadFormatted: templateKey === "CANADA" ? amountDestinationFormatted : "",
    amountCadWords: templateKey === "CANADA" ? amountDestinationFormatted : "",
    monthlyCad: templateKey === "CANADA" ? monthlyAmount : undefined,
    monthlyCadFormatted: templateKey === "CANADA" ? monthlyDestinationFormatted : "",
    monthlyCadWords: templateKey === "CANADA" ? monthlyDestinationFormatted : "",
  };
}

function buildAviIdentifiers(seed: {
  destinationCountryCode: string;
  departureCountryCode: string;
  issueYearShort: string;
  seriesCode: string;
  sequenceNumber: number;
}) {
  const sequenceNumberPadded = padSequenceNumber(seed.sequenceNumber);
  const parts = [
    "AVI",
    seed.destinationCountryCode,
    seed.issueYearShort,
    seed.departureCountryCode,
    seed.seriesCode,
    sequenceNumberPadded,
  ];
  const aviNumberDisplay = parts.join("/");
  const verificationCode = parts.join("-");

  return {
    ...seed,
    sequenceNumberPadded,
    aviNumberDisplay,
    verificationCode,
    verificationUrl: buildVerificationUrl(verificationCode),
    counterKey: [
      seed.destinationCountryCode,
      seed.issueYearShort,
      seed.departureCountryCode,
      seed.seriesCode,
    ].join("_"),
  };
}

function parseOfficialAviReference(input: unknown): Omit<AviIdentifiers, "sequenceNumber" | "verificationUrl" | "counterKey"> | null {
  const normalized = cleanString(input).toUpperCase().replace(/\s+/g, "");
  if (!normalized) return null;

  const separator = normalized.includes("/") ? "/" : "-";
  const parts = normalized.split(separator);
  if (parts.length !== 6 || parts[0] !== "AVI") return null;

  const destinationCountryCode = normalizeCode(parts[1], 2);
  const issueYearShort = normalizeCode(parts[2], 2);
  const departureCountryCode = normalizeCode(parts[3], 4);
  const seriesCode = normalizeSeriesCode(parts[4]);
  const sequenceNumberPadded = cleanString(parts[5]).replace(/\D/g, "").padStart(8, "0");
  if (!destinationCountryCode || !issueYearShort || !departureCountryCode || !seriesCode || !sequenceNumberPadded) {
    return null;
  }

  const canonicalParts = [
    "AVI",
    destinationCountryCode,
    issueYearShort,
    departureCountryCode,
    seriesCode,
    sequenceNumberPadded,
  ];

  return {
    destinationCountryCode,
    departureCountryCode,
    issueYearShort,
    seriesCode,
    sequenceNumberPadded,
    aviNumberDisplay: canonicalParts.join("/"),
    verificationCode: canonicalParts.join("-"),
  };
}

async function reserveAviIdentifiers(payload: ManualAviPayload, issuedDate: Date) {
  const parsed = parseOfficialAviReference(payload.aviReference);
  if (parsed) {
    return {
      ...parsed,
      sequenceNumber: Number(parsed.sequenceNumberPadded),
      verificationUrl: buildVerificationUrl(parsed.verificationCode),
      counterKey: [
        parsed.destinationCountryCode,
        parsed.issueYearShort,
        parsed.departureCountryCode,
        parsed.seriesCode,
      ].join("_"),
    };
  }

  const destinationCountryCode = inferDestinationCountryCode(payload.destinationCountry);
  const departureCountryCode = inferDepartureCountryCode(payload.originCountry ?? "Cameroun");
  if (!destinationCountryCode) throw new Error("Pays destination AVI non reconnu.");
  if (!departureCountryCode) throw new Error("Pays d'origine AVI non reconnu.");

  const issueYearShort = getIssueYearShort(issuedDate);
  const seriesCode = normalizeSeriesCode(payload.seriesCode);
  const counterKey = [destinationCountryCode, issueYearShort, departureCountryCode, seriesCode].join("_");
  const db = getAdminFirestore();
  let identifiers: AviIdentifiers | null = null;

  await db.runTransaction(async (transaction) => {
    const counterRef = db.collection("counters").doc("avi_sequences").collection("items").doc(counterKey);
    const counterSnap = await transaction.get(counterRef);
    const lastSequence = counterSnap.exists ? Number(counterSnap.data()?.lastSequence ?? 0) : 0;
    if (!Number.isFinite(lastSequence) || lastSequence < 0) {
      throw new Error(`Counter ${counterKey} is invalid.`);
    }

    identifiers = buildAviIdentifiers({
      destinationCountryCode,
      departureCountryCode,
      issueYearShort,
      seriesCode,
      sequenceNumber: Math.floor(lastSequence) + 1,
    });
    const attestationRef = db.collection("attestations").doc(identifiers.verificationCode);
    const attestationSnap = await transaction.get(attestationRef);
    if (attestationSnap.exists) {
      throw new Error(`Generated AVI reference already exists: ${identifiers.verificationCode}.`);
    }

    transaction.set(counterRef, {
      key: identifiers.counterKey,
      destinationCountryCode,
      issueYearShort,
      departureCountryCode,
      seriesCode,
      lastSequence: identifiers.sequenceNumber,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  if (!identifiers) throw new Error("Reference AVI impossible a reserver.");
  return identifiers;
}

function buildAviTemplateValues(
  payload: ManualAviPayload,
  identifiers: AviIdentifiers,
  qrCodeDataUrl: string,
  templateKey: TemplateKey,
) {
  const issuedDate = parseDateLike(payload.issueDate) ?? new Date();
  const expiresDate = parseDateLike(payload.validUntil) ?? addMonths(issuedDate, 12);
  const issuedAt = formatDateFr(issuedDate);
  const expiresAt = formatDateFr(expiresDate);
  const amounts = destinationAmountFields(payload, templateKey);
  const destinationCountryName = getCountryName(identifiers.destinationCountryCode, payload.destinationCountry);

  return {
    ...amounts,
    academicYear: payload.academicYear,
    aviNumberDisplay: identifiers.aviNumberDisplay,
    blockedAccountIban: valueString(process.env.EUROPE_BLOCKED_ACCOUNT_IBAN, "Compte partenaire AVI CERTIFY"),
    blockedAccountNumber: valueString(process.env.CANADA_BLOCKED_ACCOUNT_NUMBER, "Compte partenaire AVI CERTIFY"),
    beneficiaryCivilite: payload.studentCivility ?? "Monsieur/Madame",
    departureCountryCode: identifiers.departureCountryCode,
    destinationCountryCode: identifiers.destinationCountryCode,
    destinationCountryName,
    expiresAt,
    validUntil: expiresAt,
    issuedAt,
    issueDate: issuedAt,
    issuedValidityDate: expiresAt,
    issueYearShort: identifiers.issueYearShort,
    partnerBankFooterLegal: valueString(process.env.EUROPE_PARTNER_BANK_FOOTER_LEGAL, "partenaire financier AVI CERTIFY"),
    partnerBankLawCountry: valueString(process.env.EUROPE_PARTNER_BANK_LAW_COUNTRY, destinationCountryName),
    partnerBankLegalDetails: valueString(process.env.EUROPE_PARTNER_BANK_LEGAL_DETAILS, "etablissement partenaire de l'operation"),
    partnerBankName: valueString(process.env.EUROPE_PARTNER_BANK_NAME, "partenaire bancaire AVI CERTIFY"),
    partnerBankWebsite: valueString(process.env.EUROPE_PARTNER_BANK_WEBSITE, "https://www.avicertify.fr"),
    partnerBankWebsiteLabel: valueString(process.env.EUROPE_PARTNER_BANK_WEBSITE_LABEL, "www.avicertify.fr"),
    qrCodeDataUrl,
    schoolName: payload.schoolName ?? "etablissement a confirmer",
    sequenceNumberPadded: identifiers.sequenceNumberPadded,
    seriesCode: identifiers.seriesCode,
    signatureStampDataUrl: "",
    studentCivility: payload.studentCivility ?? "Monsieur/Madame",
    studentFullName: payload.studentFullName,
    verificationCode: identifiers.verificationCode,
    verificationUrl: identifiers.verificationUrl,
  };
}

async function renderOfficialAviCertificateHtml(
  payload: ManualAviPayload,
  identifiers: AviIdentifiers,
  qrWidth = 260,
) {
  const template = selectAviTemplate({ ...payload, ...identifiers });
  const qrCodeDataUrl = await QRCode.toDataURL(identifiers.verificationUrl, {
    margin: 1,
    width: qrWidth,
  });
  const values = buildAviTemplateValues(payload, identifiers, qrCodeDataUrl, template.templateKey);
  await validateTemplateValues(template.templateName, values);
  const { html } = await loadTemplateInfo(template.templateName);

  return {
    ...template,
    html: renderTemplate(html, values),
    values,
    qrCodeDataUrl,
  };
}

async function renderHtmlToPdfBuffer(html: string) {
  if (!cleanString(html)) {
    throw new Error("HTML officiel vide : conversion PDF impossible.");
  }

  const headless = "shell";
  const viewport = {
    deviceScaleFactor: 1,
    hasTouch: false,
    height: 1123,
    isLandscape: false,
    isMobile: false,
    width: 794,
  };

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: chromium.args, headless }),
      defaultViewport: viewport,
      executablePath: await chromium.executablePath(),
      headless,
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(60_000);
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 60_000,
    });
    await page.emulateMediaType("print");
    await page.evaluate(
      "document.fonts && document.fonts.ready ? document.fonts.ready.then(function() {}) : Promise.resolve()",
    );
    const pdfBytes = await page.pdf({
      format: "A4",
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
      printBackground: true,
    });

    return Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

function documentVersionId(date = new Date()) {
  return `${date.toISOString().replace(/[^0-9a-z]+/gi, "")}-${Math.random().toString(36).slice(2, 8)}`;
}

function documentFileName(reference: string, type: "html" | "pdf") {
  const extension = type === "html" ? "html" : "pdf";
  const safeReference = cleanString(reference, "avi-document")
    .replace(/[^a-z0-9._-]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "avi-document";
  return `${safeReference}.${extension}`;
}

async function saveHtml(storagePath: string, html: string) {
  await getAdminStorage().bucket().file(storagePath).save(Buffer.from(html, "utf8"), {
    resumable: false,
    metadata: {
      contentType: "text/html; charset=utf-8",
      cacheControl: "private, max-age=0, no-transform",
    },
  });
}

async function savePdf(storagePath: string, pdf: Buffer, metadata: Record<string, string>) {
  await getAdminStorage().bucket().file(storagePath).save(pdf, {
    resumable: false,
    metadata: {
      contentType: "application/pdf",
      cacheControl: "private, max-age=0, no-transform",
      metadata,
    },
  });
}

async function recordDocumentVersion({
  reference,
  actor,
  templateName,
  templateTitle,
  htmlStoragePath,
  pdfStoragePath,
  html,
  pdf,
}: {
  reference: string;
  actor: AdminActor;
  templateName: string;
  templateTitle: string;
  htmlStoragePath: string;
  pdfStoragePath: string;
  html: string;
  pdf: Buffer;
}) {
  const db = getAdminFirestore();
  const attestationRef = db.collection("attestations").doc(reference);
  const generatedAt = new Date();
  const collection = attestationRef.collection("document_versions");
  const currentSnap = await collection.where("isCurrent", "==", true).limit(20).get();
  if (!currentSnap.empty) {
    const batch = db.batch();
    currentSnap.docs.forEach((doc) => batch.update(doc.ref, { isCurrent: false }));
    await batch.commit();
  }

  await collection.doc(documentVersionId(generatedAt)).set({
    type: "html+pdf",
    pdfGenerationEngine: "chromium-html",
    templateName,
    templateTitle,
    htmlStoragePath,
    pdfStoragePath,
    generatedAt: Timestamp.fromDate(generatedAt),
    generatedBy: actor.email ?? actor.uid,
    generatedByUid: actor.uid,
    trigger: "admin_generate",
    status: "generated",
    htmlFileSize: Buffer.byteLength(html, "utf8"),
    pdfFileSize: pdf.length,
    isCurrent: true,
  });
}

async function writeAuditLog({
  reference,
  actor,
  storagePath,
  htmlStoragePath,
  templateName,
  templateKey,
}: {
  reference: string;
  actor: AdminActor;
  storagePath: string;
  htmlStoragePath: string;
  templateName: string;
  templateKey: TemplateKey;
}) {
  await getAdminFirestore().collection("audit_logs").add({
    action: "AVI_PDF_GENERATED",
    targetType: "pdf",
    targetId: reference,
    actorUid: actor.uid,
    actorEmail: actor.email ?? null,
    actorRole: actor.role,
    source: "ADMIN_PANEL",
    details: {
      storagePath,
      htmlStoragePath,
      templateName,
      templateKey,
      renderer: "chromium-html",
    },
    createdAt: FieldValue.serverTimestamp(),
  });
}

function storagePaths(reference: string) {
  return {
    pdfStoragePath: `avi-certificates/${encodeURIComponent(reference)}.pdf`,
    htmlStoragePath: `avi-certificates/${encodeURIComponent(reference)}.html`,
  };
}

export async function generateManualAviPdf(data: ManualAviPayload) {
  const issuedDate = parseDateLike(data.issueDate) ?? new Date();
  const identifiers = await reserveAviIdentifiers(data, issuedDate);
  const rendered = await renderOfficialAviCertificateHtml(data, identifiers);

  return {
    identifiers,
    rendered,
    pdf: await renderHtmlToPdfBuffer(rendered.html),
  };
}

export async function generateAndStoreManualAvi({
  payload,
  actor,
}: {
  payload: ManualAviPayload;
  actor: AdminActor;
}): Promise<ManualAviGenerationResult> {
  const { identifiers, rendered, pdf } = await generateManualAviPdf(payload);
  const reference = identifiers.verificationCode;
  const { pdfStoragePath, htmlStoragePath } = storagePaths(reference);
  const templateTitle = officialPdfTemplateTitle(rendered.templateKey);
  const now = FieldValue.serverTimestamp();
  const issuedDate = parseDateLike(payload.issueDate) ?? new Date();
  const expiresDate = parseDateLike(payload.validUntil) ?? addMonths(issuedDate, 12);
  const destinationCountryName = getCountryName(identifiers.destinationCountryCode, payload.destinationCountry);
  const originCountryName = getCountryName(identifiers.departureCountryCode, payload.originCountry ?? "Cameroun");

  await saveHtml(htmlStoragePath, rendered.html);
  await savePdf(pdfStoragePath, pdf, {
    reference,
    verificationCode: reference,
    aviNumberDisplay: identifiers.aviNumberDisplay,
    generatedBy: actor.uid,
    source: "admin_manual",
  });

  const attestationRef = getAdminFirestore().collection("attestations").doc(reference);
  await attestationRef.set(
    {
      reference,
      id: reference,
      type: "avi",
      status: "ACTIVE",
      student_name: payload.studentFullName,
      studentFullName: payload.studentFullName,
      studentEmail: payload.studentEmail ?? null,
      studentBirthDate: payload.studentDateOfBirth ?? null,
      studentBirthPlace: payload.studentPlaceOfBirth ?? null,
      issuer: "AVI CERTIFY",
      country: destinationCountryName,
      destinationCountry: destinationCountryName,
      destinationCountryCode: identifiers.destinationCountryCode,
      originCountry: originCountryName,
      departureCountryName: originCountryName,
      departureCountryCode: identifiers.departureCountryCode,
      avi_amount: payload.aviAmount,
      aviAmount: payload.aviAmount,
      currency: payload.currency,
      schoolName: payload.schoolName ?? null,
      academicYear: payload.academicYear,
      internalCaseReference: payload.internalCaseReference ?? null,
      issuedAt: Timestamp.fromDate(issuedDate),
      issued_at: formatDateFr(issuedDate),
      expiresAt: Timestamp.fromDate(expiresDate),
      expires_at: formatDateFr(expiresDate),
      validUntil: payload.validUntil ?? null,
      verificationCode: reference,
      aviNumberDisplay: identifiers.aviNumberDisplay,
      referenceCode: identifiers.aviNumberDisplay,
      reference_code: identifiers.aviNumberDisplay,
      verificationUrl: identifiers.verificationUrl,
      qrCodeData: identifiers.verificationUrl,
      qrCodeDataUrl: rendered.qrCodeDataUrl,
      pdfStoragePath,
      pdfHtmlStoragePath: htmlStoragePath,
      pdfGeneratedAt: now,
      pdfHtmlGeneratedAt: now,
      pdfGenerationEngine: "chromium-html",
      pdfSourceTemplate: rendered.templateName,
      pdfTemplateName: rendered.templateName,
      pdfTemplateTitle: templateTitle,
      source: "admin_manual",
      generatedBy: actor.email ?? actor.uid,
      generatedByUid: actor.uid,
      createdAt: now,
      updatedAt: now,
      auditTrail: FieldValue.arrayUnion({
        action: "generate_avi_pdf",
        actor: actor.email ?? actor.uid,
        status: "ACTIVE",
        source: "ADMIN_PANEL",
        at: new Date().toISOString(),
      }),
    },
    { merge: true },
  );

  await recordDocumentVersion({
    reference,
    actor,
    templateName: rendered.templateName,
    templateTitle,
    htmlStoragePath,
    pdfStoragePath,
    html: rendered.html,
    pdf,
  });
  await writeAuditLog({
    reference,
    actor,
    storagePath: pdfStoragePath,
    htmlStoragePath,
    templateName: rendered.templateName,
    templateKey: rendered.templateKey,
  });

  return {
    generated: true,
    reference,
    documentId: reference,
    aviNumberDisplay: identifiers.aviNumberDisplay,
    verificationCode: reference,
    verificationUrl: identifiers.verificationUrl,
    storagePath: pdfStoragePath,
    htmlStoragePath,
    downloadUrl: `/api/admin/avi/${encodeURIComponent(reference)}/download`,
    templateName: rendered.templateName,
    templateKey: rendered.templateKey,
    pdfTemplateTitle: templateTitle,
    pdfGenerationEngine: "chromium-html",
    size: pdf.length,
  };
}

export async function getStoredManualAviPdf(reference: string) {
  const parsed = parseOfficialAviReference(reference);
  const verificationCode = parsed?.verificationCode ?? cleanString(reference);
  if (!verificationCode || verificationCode.length > 160) {
    throw new Error("Reference AVI invalide.");
  }

  const snap = await getAdminFirestore().collection("attestations").doc(verificationCode).get();
  if (!snap.exists) {
    throw new Error("Attestation AVI introuvable.");
  }

  const data = snap.data() ?? {};
  const storagePath = cleanString(data.pdfStoragePath);
  if (!storagePath || !storagePath.startsWith("avi-certificates/")) {
    throw new Error("PDF AVI officiel introuvable.");
  }

  const file = getAdminStorage().bucket().file(storagePath);
  const [buffer] = await file.download();

  return {
    buffer,
    reference: verificationCode,
    storagePath,
    fileName: documentFileName(verificationCode, "pdf"),
  };
}
