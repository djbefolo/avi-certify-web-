import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFImage, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import {
  getHousingCertificateParagraphs,
  type HousingCertificateTemplateData,
} from "@/lib/certificates/housing-certificate-template";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 52;

const logoAssetCandidates = [
  "public/assets/avi-certify-logo.png",
  "public/avi-certify-logo.png",
  "public/logo.png",
  "src/assets/avi-certify-logo.png",
];

function sanitizeWinAnsi(value: string) {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/–/g, "-");
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

async function loadAsset(candidates: string[], label: string) {
  for (const candidate of candidates) {
    try {
      return await readFile(path.join(process.cwd(), candidate));
    } catch {
      // Try the next known asset path.
    }
  }

  console.warn(`[certificate-generator] ${label} asset could not be loaded`, {
    candidates,
  });
  return null;
}

async function embedImage(pdf: PDFDocument, candidates: string[], label: string) {
  const asset = await loadAsset(candidates, label);

  if (!asset) {
    return null;
  }

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

function fitImage({
  image,
  maxWidth,
  maxHeight,
  x,
  y,
}: {
  image: PDFImage;
  maxWidth: number;
  maxHeight: number;
  x: number;
  y: number;
}) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);

  return {
    x,
    y,
    width: image.width * scale,
    height: image.height * scale,
  };
}

function drawText(
  page: ReturnType<PDFDocument["addPage"]>,
  text: string,
  options: Parameters<typeof page.drawText>[1],
) {
  page.drawText(sanitizeWinAnsi(text), options);
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
  const logoImage = await embedImage(
    pdf,
    logoAssetCandidates,
    "AVI CERTIFY logo",
  );
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
  const qrImage = await pdf.embedPng(qrDataUrl);
  const dark = rgb(0.08, 0.1, 0.16);
  const muted = rgb(0.36, 0.39, 0.46);
  const border = rgb(0.86, 0.88, 0.91);
  let y = pageHeight - margin;

  page.drawLine({
    start: { x: margin, y: pageHeight - 112 },
    end: { x: pageWidth - margin, y: pageHeight - 112 },
    thickness: 0.7,
    color: border,
  });

  if (logoImage) {
    page.drawImage(
      logoImage,
      fitImage({
        image: logoImage,
        maxWidth: 118,
        maxHeight: 72,
        x: margin,
        y: pageHeight - 96,
      }),
    );
  } else {
    drawText(page, "AVI CERTIFY", {
      x: margin,
      y,
      size: 20,
      font: bold,
      color: dark,
    });
  }

  drawText(page, `N° ${data.certificateNumber}`, {
    x: pageWidth - margin - 152,
    y: pageHeight - 68,
    size: 10,
    font: bold,
    color: muted,
  });

  y = pageHeight - 150;
  drawText(page, "ATTESTATION D'HÉBERGEMENT / DOMICILIATION", {
    x: margin,
    y,
    size: 15,
    font: bold,
    color: dark,
  });
  page.drawLine({
    start: { x: margin, y: y - 10 },
    end: { x: pageWidth - margin, y: y - 10 },
    thickness: 0.4,
    color: border,
  });

  y -= 32;

  for (const paragraph of getHousingCertificateParagraphs(data)) {
    const lines = wrapText(paragraph, pageWidth - margin * 2, 9.6);

    for (const line of lines) {
      drawText(page, line, {
        x: margin,
        y,
        size: 9.6,
        font: paragraph === data.housing.fullAddress ? bold : regular,
        color: dark,
      });
      y -= 12.8;
    }

    y -= 5.5;
  }

  const verificationY = 146;
  page.drawLine({
    start: { x: margin, y: verificationY + 104 },
    end: { x: pageWidth - margin, y: verificationY + 104 },
    thickness: 0.7,
    color: border,
  });
  page.drawImage(qrImage, {
    x: margin,
    y: verificationY,
    width: 82,
    height: 82,
  });
  drawText(page, "Scannez ce QR code pour vérifier l'authenticité du document.", {
    x: margin + 98,
    y: verificationY + 52,
    size: 10,
    font: bold,
    color: dark,
  });
  drawText(page, "Vérification en ligne AVI CERTIFY", {
    x: margin + 98,
    y: verificationY + 32,
    size: 9.5,
    font: regular,
    color: muted,
  });

  drawText(page, `Fait à Pontarlier, France, le ${data.issueDate}`, {
    x: margin,
    y: 112,
    size: 10,
    font: regular,
    color: dark,
  });

  const signatureX = pageWidth - margin - 178;
  drawText(page, "Signature autorisee AVI CERTIFY", {
    x: signatureX,
    y: 90,
    size: 13,
    font: bold,
    color: rgb(0.12, 0.2, 0.34),
  });

  drawText(page, "BEFOLO NKOA Gabriel, Emmanuel", {
    x: signatureX,
    y: 42,
    size: 9.5,
    font: bold,
    color: dark,
  });
  drawText(page, "Président, AVI CERTIFY", {
    x: signatureX,
    y: 28,
    size: 9,
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
