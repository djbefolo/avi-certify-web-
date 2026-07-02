import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFImage, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ManualAviPayload } from "@/lib/validations/avi";

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;

const logoAssetCandidates = [
  "public/assets/photos/avi-certify-logo.png",
  "public/assets/photos/logo_avi_certify.png",
  "public/email/avi-certify-logo.png",
];

const dark = rgb(0.06, 0.1, 0.18);
const muted = rgb(0.37, 0.41, 0.48);
const blue = rgb(0.05, 0.21, 0.45);
const green = rgb(0.04, 0.48, 0.42);
const border = rgb(0.86, 0.88, 0.91);

function pdfText(value: unknown) {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function formatDate(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return pdfText(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ${currency}`;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const averageCharacterWidth = fontSize * 0.48;
  const maxCharacters = Math.max(24, Math.floor(maxWidth / averageCharacterWidth));

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

async function loadAsset(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      return await readFile(path.join(process.cwd(), candidate));
    } catch {
      // Try the next known logo path.
    }
  }

  return null;
}

async function embedLogo(pdf: PDFDocument) {
  const asset = await loadAsset(logoAssetCandidates);
  if (!asset) return null;

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

function fitImage(image: PDFImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);

  return {
    width: image.width * scale,
    height: image.height * scale,
  };
}

function drawText(
  page: PDFPage,
  text: string,
  options: Parameters<PDFPage["drawText"]>[1],
) {
  page.drawText(pdfText(text), options);
}

function drawWrappedText({
  page,
  text,
  x,
  y,
  width,
  size,
  font,
  color = dark,
  lineHeight = size + 4,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  font: PDFFont;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
}) {
  let nextY = y;
  for (const line of wrapText(text, width, size)) {
    drawText(page, line, { x, y: nextY, size, font, color });
    nextY -= lineHeight;
  }

  return nextY;
}

function drawKeyValue({
  page,
  label,
  value,
  x,
  y,
  font,
  bold,
}: {
  page: PDFPage;
  label: string;
  value: string;
  x: number;
  y: number;
  font: PDFFont;
  bold: PDFFont;
}) {
  drawText(page, label, { x, y, size: 9, font: bold, color: muted });
  drawText(page, value || "-", { x, y: y - 15, size: 11, font, color: dark });
}

export async function generateManualAviPdf(data: ManualAviPayload) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([pageWidth, pageHeight]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  page.drawRectangle({ x: 0, y: pageHeight - 92, width: pageWidth, height: 92, color: blue });
  if (logo) {
    const fitted = fitImage(logo, 126, 54);
    page.drawImage(logo, {
      x: margin,
      y: pageHeight - 73,
      ...fitted,
    });
  } else {
    drawText(page, "AVI CERTIFY", {
      x: margin,
      y: pageHeight - 58,
      size: 20,
      font: bold,
      color: rgb(1, 1, 1),
    });
  }

  drawText(page, "Document admin manuel", {
    x: pageWidth - margin - 150,
    y: pageHeight - 40,
    size: 9,
    font: bold,
    color: rgb(0.82, 0.9, 1),
  });
  drawText(page, data.templateVersion, {
    x: pageWidth - margin - 150,
    y: pageHeight - 56,
    size: 8,
    font: regular,
    color: rgb(0.82, 0.9, 1),
  });

  let y = pageHeight - 134;
  drawText(page, "ATTESTATION DE VIREMENT IRREVOCABLE", {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: dark,
  });
  drawText(page, `Reference AVI : ${data.aviReference}`, {
    x: margin,
    y: y - 24,
    size: 10,
    font: bold,
    color: green,
  });

  y -= 58;
  page.drawRectangle({
    x: margin,
    y: y - 114,
    width: pageWidth - margin * 2,
    height: 130,
    borderColor: border,
    borderWidth: 1,
  });

  drawKeyValue({ page, label: "Beneficiaire", value: data.studentFullName, x: margin + 18, y: y - 8, font: regular, bold });
  drawKeyValue({ page, label: "Montant AVI", value: formatAmount(data.aviAmount, data.currency), x: margin + 266, y: y - 8, font: regular, bold });
  drawKeyValue({ page, label: "Destination", value: data.destinationCountry, x: margin + 18, y: y - 62, font: regular, bold });
  drawKeyValue({ page, label: "Annee academique", value: data.academicYear, x: margin + 266, y: y - 62, font: regular, bold });

  y -= 158;
  const details = [
    ["Date d'emission", formatDate(data.issueDate)],
    ["Validite", data.validUntil ? formatDate(data.validUntil) : "A confirmer"],
    ["Email client", data.studentEmail ?? "-"],
    ["Pays d'origine", data.originCountry ?? "-"],
    ["Date de naissance", data.studentDateOfBirth ? formatDate(data.studentDateOfBirth) : "-"],
    ["Lieu de naissance", data.studentPlaceOfBirth ?? "-"],
    ["Etablissement", data.schoolName ?? "-"],
    ["Reference interne", data.internalCaseReference ?? "-"],
  ];

  for (let index = 0; index < details.length; index += 1) {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + column * 250;
    const rowY = y - row * 44;
    drawKeyValue({
      page,
      label: details[index][0],
      value: details[index][1],
      x,
      y: rowY,
      font: regular,
      bold,
    });
  }

  y -= 198;
  drawText(page, "Mention institutionnelle", {
    x: margin,
    y,
    size: 12,
    font: bold,
    color: dark,
  });
  y = drawWrappedText({
    page,
    text:
      "AVI CERTIFY confirme la preparation manuelle de cette attestation sur la base des informations communiquees et verifiees par l'equipe administrative. Ce document est emis pour appuyer le dossier de mobilite internationale du beneficiaire mentionne ci-dessus.",
    x: margin,
    y: y - 22,
    width: pageWidth - margin * 2,
    size: 10,
    font: regular,
    color: dark,
  });

  y -= 18;
  page.drawRectangle({
    x: margin,
    y: y - 64,
    width: pageWidth - margin * 2,
    height: 78,
    borderColor: green,
    borderWidth: 1,
  });
  drawText(page, "Bloc de verification", {
    x: margin + 16,
    y: y - 8,
    size: 11,
    font: bold,
    color: green,
  });
  drawText(page, `Reference : ${data.aviReference}`, {
    x: margin + 16,
    y: y - 28,
    size: 10,
    font: regular,
    color: dark,
  });
  drawText(page, "Verification publique QR reportee a la phase P5C/P5D.", {
    x: margin + 16,
    y: y - 46,
    size: 9,
    font: regular,
    color: muted,
  });

  drawText(page, "Document a verifier avant usage officiel. Texte juridique/business a valider.", {
    x: margin,
    y: 86,
    size: 8.5,
    font: bold,
    color: muted,
  });
  drawText(page, "AVI CERTIFY - contact@avicertify.com - 75 Rue de Besancon, 25300 Pontarlier, France", {
    x: margin,
    y: 64,
    size: 8.5,
    font: regular,
    color: muted,
  });
  drawText(page, "Ce document ne doit pas etre genere automatiquement depuis Stripe dans cette version.", {
    x: margin,
    y: 48,
    size: 8,
    font: regular,
    color: muted,
  });

  return Buffer.from(await pdf.save());
}

