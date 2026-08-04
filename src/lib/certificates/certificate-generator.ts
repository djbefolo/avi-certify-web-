import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  type PDFImage,
  type PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import QRCode from "qrcode";
import {
  getHousingCertificateParagraphs,
  type HousingCertificateTemplateData,
} from "@/lib/certificates/housing-certificate-template";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 52;
const templateVersion = "housing-conditional-v1";

const logoAssetCandidates = [
  "public/assets/photos/avi-certify-logo.png",
  "public/assets/photos/logo_avi_certify.png",
  "public/assets/avi-certify-logo.png",
  "public/avi-certify-logo.png",
  "public/logo.png",
  "src/assets/avi-certify-logo.png",
];

function sanitizeWinAnsi(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u0153/g, "oe")
    .replace(/\u0152/g, "OE")
    .replace(/[\u2013\u2014]/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = sanitizeWinAnsi(text).split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  const maxCharacters = Math.max(24, Math.floor(maxWidth / (fontSize * 0.48)));

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadAsset(candidates: string[], label: string) {
  for (const candidate of candidates) {
    try {
      return await readFile(path.join(process.cwd(), candidate));
    } catch {
      // Try the next known server-side asset path.
    }
  }
  console.warn(`[certificate-generator] ${label} asset could not be loaded`, {
    candidates,
  });
  return null;
}

async function embedImage(pdf: PDFDocument, candidates: string[], label: string) {
  const asset = await loadAsset(candidates, label);
  if (!asset) return null;
  try {
    return await pdf.embedPng(asset);
  } catch {
    try {
      return await pdf.embedJpg(asset);
    } catch (error) {
      console.warn(`[certificate-generator] ${label} asset is not embeddable`, {
        error,
      });
      return null;
    }
  }
}

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

function formatCertificateDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(date);
}

export async function generateHousingCertificatePdf(
  data: HousingCertificateTemplateData,
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedImage(pdf, logoAssetCandidates, "AVI CERTIFY logo");
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
  const qr = await pdf.embedPng(qrDataUrl);
  const dark = rgb(0.06, 0.11, 0.2);
  const muted = rgb(0.35, 0.39, 0.46);
  const green = rgb(0.05, 0.42, 0.29);
  const border = rgb(0.84, 0.87, 0.9);

  function drawHeader(page: PDFPage, continuation = false) {
    if (logo) {
      const dimensions = fitImage(logo, 116, 58);
      page.drawImage(logo, {
        x: margin,
        y: pageHeight - 92,
        ...dimensions,
      });
    } else {
      page.drawText("AVI CERTIFY", {
        x: margin,
        y: pageHeight - 70,
        size: 19,
        font: bold,
        color: dark,
      });
    }
    page.drawText(`No ${data.certificateNumber}`, {
      x: pageWidth - margin - 170,
      y: pageHeight - 67,
      size: 9.5,
      font: bold,
      color: muted,
    });
    page.drawLine({
      start: { x: margin, y: pageHeight - 112 },
      end: { x: pageWidth - margin, y: pageHeight - 112 },
      thickness: 0.7,
      color: border,
    });
    page.drawText(
      continuation
        ? "ATTESTATION CONDITIONNELLE DE LOGEMENT - SUITE"
        : "ATTESTATION CONDITIONNELLE DE LOGEMENT",
      {
        x: margin,
        y: pageHeight - 146,
        size: 14.5,
        font: bold,
        color: dark,
      },
    );
    page.drawText("STATUT : CONDITIONNEL", {
      x: margin,
      y: pageHeight - 164,
      size: 8.5,
      font: bold,
      color: green,
    });
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  drawHeader(page);
  let y = pageHeight - 194;

  for (const paragraph of getHousingCertificateParagraphs(data)) {
    const lines = wrapText(paragraph, pageWidth - margin * 2, 9.35);
    if (y - lines.length * 12.4 < 190) {
      page = pdf.addPage([pageWidth, pageHeight]);
      drawHeader(page, true);
      y = pageHeight - 194;
    }
    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 9.35,
        font: paragraph.includes(data.housing.fullAddress) ? bold : regular,
        color: dark,
      });
      y -= 12.4;
    }
    y -= 6;
  }

  if (y < 255) {
    page = pdf.addPage([pageWidth, pageHeight]);
    drawHeader(page, true);
    y = pageHeight - 194;
  }

  page.drawLine({
    start: { x: margin, y: y - 6 },
    end: { x: pageWidth - margin, y: y - 6 },
    thickness: 0.7,
    color: border,
  });
  page.drawImage(qr, { x: margin, y: y - 102, width: 82, height: 82 });
  page.drawText("Verification publique AVI CERTIFY", {
    x: margin + 98,
    y: y - 48,
    size: 10,
    font: bold,
    color: dark,
  });
  page.drawText("Scannez le QR code pour verifier le statut du document.", {
    x: margin + 98,
    y: y - 67,
    size: 9,
    font: regular,
    color: muted,
  });
  page.drawText(`Fait a Pontarlier, France, le ${data.issueDate}`, {
    x: margin,
    y: y - 132,
    size: 9.5,
    font: regular,
    color: dark,
  });
  page.drawText("Emission electronique AVI CERTIFY", {
    x: pageWidth - margin - 190,
    y: y - 132,
    size: 10,
    font: bold,
    color: dark,
  });
  page.drawText("BEFOLO NKOA Gabriel, Emmanuel - President", {
    x: pageWidth - margin - 190,
    y: y - 149,
    size: 8.5,
    font: regular,
    color: muted,
  });
  page.drawText(`Version ${data.templateVersion ?? templateVersion}`, {
    x: margin,
    y: 28,
    size: 7.5,
    font: regular,
    color: muted,
  });

  return Buffer.from(await pdf.save());
}

export function getDefaultCertificateDates(now = new Date()) {
  const entryDate = new Date(now);
  entryDate.setMonth(entryDate.getMonth() + 1);
  return {
    issueDate: formatCertificateDate(now),
    entryDate: formatCertificateDate(entryDate),
  };
}
