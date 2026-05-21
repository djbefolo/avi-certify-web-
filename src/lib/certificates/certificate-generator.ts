import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import {
  getHousingCertificateParagraphs,
  type HousingCertificateTemplateData,
} from "@/lib/certificates/housing-certificate-template";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 56;

function sanitizeWinAnsi(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE");
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = sanitizeWinAnsi(text).split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  const averageCharacterWidth = fontSize * 0.48;
  const maxCharacters = Math.max(24, Math.floor(maxWidth / averageCharacterWidth));

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatCertificateDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

export async function generateHousingCertificatePdf(
  data: HousingCertificateTemplateData,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
  const qrImage = await pdf.embedPng(qrDataUrl);
  const dark = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.35, 0.38, 0.45);
  let y = pageHeight - margin;

  page.drawText("AVI CERTIFY", {
    x: margin,
    y,
    size: 20,
    font: bold,
    color: dark,
  });
  page.drawText("Attestation d'hebergement / domiciliation", {
    x: margin,
    y: y - 22,
    size: 12,
    font: regular,
    color: muted,
  });
  page.drawText(`N° ${data.certificateNumber}`, {
    x: pageWidth - margin - 150,
    y,
    size: 10,
    font: bold,
    color: muted,
  });

  y -= 72;
  page.drawText("ATTESTATION D'HEBERGEMENT", {
    x: margin,
    y,
    size: 15,
    font: bold,
    color: dark,
  });

  y -= 30;

  for (const paragraph of getHousingCertificateParagraphs(data)) {
    const lines = wrapText(paragraph, pageWidth - margin * 2, 10.5);

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10.5,
        font: paragraph === data.housing.address ? bold : regular,
        color: dark,
      });
      y -= 15;
    }

    y -= 8;
  }

  y -= 4;
  page.drawText("Verifiez l'authenticite du document :", {
    x: margin,
    y,
    size: 10.5,
    font: bold,
    color: dark,
  });
  y -= 92;
  page.drawImage(qrImage, {
    x: margin,
    y,
    width: 82,
    height: 82,
  });
  page.drawText(data.verificationUrl, {
    x: margin + 98,
    y: y + 38,
    size: 9,
    font: regular,
    color: muted,
  });

  y -= 36;
  page.drawText(`Fait a Pontarlier, France, le ${data.issueDate}`, {
    x: margin,
    y,
    size: 10.5,
    font: regular,
    color: dark,
  });

  y -= 42;
  page.drawText("BEFOLO NKOA Gabriel, Emmanuel", {
    x: pageWidth - margin - 210,
    y,
    size: 10.5,
    font: bold,
    color: dark,
  });
  page.drawText("President, AVI CERTIFY", {
    x: pageWidth - margin - 210,
    y: y - 16,
    size: 10,
    font: regular,
    color: muted,
  });

  page.drawText("Signature", {
    x: pageWidth - margin - 210,
    y: y - 52,
    size: 16,
    font: bold,
    color: rgb(0.12, 0.2, 0.34),
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
