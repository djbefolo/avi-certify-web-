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
const margin = 56;

const logoAssetCandidates = [
  "public/avi-certify-logo.png",
  "public/logo.png",
  "public/assets/avi-certify-logo.png",
  "src/assets/avi-certify-logo.png",
];

const signatureAssetCandidates = [
  "public/president-signature.png",
  "public/signature.png",
  "public/assets/president-signature.png",
  "src/assets/president-signature.png",
];

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

async function loadAsset(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      return await readFile(path.join(process.cwd(), candidate));
    } catch {
      // Asset is optional. Keep generation stable if branding files are absent.
    }
  }

  return null;
}

async function embedImage(pdf: PDFDocument, candidates: string[]) {
  const asset = await loadAsset(candidates);

  if (!asset) {
    return null;
  }

  try {
    return await pdf.embedPng(asset);
  } catch {
    try {
      return await pdf.embedJpg(asset);
    } catch {
      return null;
    }
  }
}

function drawImageContained({
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
  const [logoImage, signatureImage] = await Promise.all([
    embedImage(pdf, logoAssetCandidates),
    embedImage(pdf, signatureAssetCandidates),
  ]);
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
  const qrImage = await pdf.embedPng(qrDataUrl);
  const dark = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.35, 0.38, 0.45);
  let y = pageHeight - margin;

  if (logoImage) {
    page.drawImage(
      logoImage,
      drawImageContained({
        image: logoImage,
        maxWidth: 118,
        maxHeight: 46,
        x: margin,
        y: y - 34,
      }),
    );
  } else {
    page.drawText("AVI CERTIFY", {
      x: margin,
      y,
      size: 20,
      font: bold,
      color: dark,
    });
  }

  page.drawText(`N° ${data.certificateNumber}`, {
    x: pageWidth - margin - 150,
    y,
    size: 10,
    font: bold,
    color: muted,
  });

  y -= 76;
  page.drawText("ATTESTATION D'HEBERGEMENT / DOMICILIATION", {
    x: margin,
    y,
    size: 15,
    font: bold,
    color: dark,
  });

  y -= 28;

  for (const paragraph of getHousingCertificateParagraphs(data)) {
    const lines = wrapText(paragraph, pageWidth - margin * 2, 10.2);

    for (const line of lines) {
      page.drawText(line, {
        x: margin,
        y,
        size: 10.2,
        font: paragraph === data.housing.fullAddress ? bold : regular,
        color: dark,
      });
      y -= 14;
    }

    y -= 7;
  }

  y -= 2;
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

  y -= 34;
  page.drawText(`Fait a Pontarlier, France, le ${data.issueDate}`, {
    x: margin,
    y,
    size: 10.5,
    font: regular,
    color: dark,
  });

  const signatureX = pageWidth - margin - 205;
  y -= 38;
  page.drawText("BEFOLO NKOA Gabriel, Emmanuel", {
    x: signatureX,
    y,
    size: 10.5,
    font: bold,
    color: dark,
  });
  page.drawText("President, AVI CERTIFY", {
    x: signatureX,
    y: y - 16,
    size: 10,
    font: regular,
    color: muted,
  });

  if (signatureImage) {
    page.drawImage(
      signatureImage,
      drawImageContained({
        image: signatureImage,
        maxWidth: 150,
        maxHeight: 70,
        x: signatureX,
        y: y - 86,
      }),
    );
  } else {
    page.drawText("Signature", {
      x: signatureX,
      y: y - 52,
      size: 16,
      font: bold,
      color: rgb(0.12, 0.2, 0.34),
    });
  }

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
