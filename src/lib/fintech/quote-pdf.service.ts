import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { getAdminStorage } from "@/lib/firebase/admin";
import { quoteOwnerUid } from "@/lib/fintech/quote.service";
import type { FinancingQuote, FinancingSimulation } from "@/types/fintech";

export type QuotePdfErrorCode =
  | "QUOTE_DATA_INVALID"
  | "QUOTE_PDF_BUILD_FAILED"
  | "QUOTE_STORAGE_UPLOAD_FAILED"
  | "QUOTE_STORAGE_BUCKET_MISSING"
  | "QUOTE_STORAGE_FILE_NOT_FOUND"
  | "QUOTE_STORAGE_METADATA_INVALID";

export class QuotePdfError extends Error {
  constructor(
    public readonly code: QuotePdfErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

const navy = rgb(0.05, 0.11, 0.22);
const green = rgb(0.04, 0.48, 0.42);
const gray = rgb(0.31, 0.36, 0.45);
export const maxQuotePdfFileSize = 10 * 1024 * 1024;
const safeStorageSegmentPattern = /^[A-Za-z0-9_-]{1,160}$/;

type QuoteStorageMetadata = {
  contentType?: string;
  size?: string | number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function pdfText(value: unknown) {
  return String(value ?? "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function money(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

function line(label: string, value: string) {
  return `${label}: ${value}`;
}

function drawWrappedText({
  page,
  text,
  x,
  y,
  maxChars,
  size,
  font,
  color,
}: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxChars: number;
  size: number;
  font: PDFFont;
  color: RGB;
}) {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  lines.slice(0, 5).forEach((item, index) => {
    page.drawText(item, { x, y: y - index * (size + 5), size, font, color });
  });

  return y - Math.min(lines.length, 5) * (size + 5);
}

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new QuotePdfError("QUOTE_DATA_INVALID", `Invalid quote PDF field: ${field}`);
  }
}

function validateQuoteForPdf(quote: FinancingQuote): FinancingSimulation {
  if (!quote.id || typeof quote.id !== "string") {
    throw new QuotePdfError("QUOTE_DATA_INVALID", "Quote id is required.");
  }

  if (!quote.simulationSnapshot || typeof quote.simulationSnapshot !== "object") {
    throw new QuotePdfError("QUOTE_DATA_INVALID", "Quote simulation snapshot is required.");
  }

  const simulation = quote.simulationSnapshot;
  assertFiniteNumber(simulation.targetAmount, "simulationSnapshot.targetAmount");
  assertFiniteNumber(simulation.financedAmount, "simulationSnapshot.financedAmount");
  assertFiniteNumber(simulation.cashDueAtSignature, "simulationSnapshot.cashDueAtSignature");
  assertFiniteNumber(simulation.monthlyRepayment, "simulationSnapshot.monthlyRepayment");
  assertFiniteNumber(simulation.netFees, "simulationSnapshot.netFees");
  assertFiniteNumber(simulation.totalClientEffort, "simulationSnapshot.totalClientEffort");

  if (simulation.targetCurrency !== "CAD" && simulation.targetCurrency !== "EUR") {
    throw new QuotePdfError("QUOTE_DATA_INVALID", "Quote target currency is invalid.");
  }

  return simulation;
}

export function quoteStorageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
}

export function quotePdfStoragePath(quote: FinancingQuote) {
  const uid = quoteOwnerUid(quote);

  if (
    !uid ||
    !safeStorageSegmentPattern.test(uid) ||
    !safeStorageSegmentPattern.test(quote.id)
  ) {
    throw new QuotePdfError(
      "QUOTE_DATA_INVALID",
      "Quote owner or identifier is invalid for secure storage.",
    );
  }

  return `admin/quotes/${uid}/${quote.id}.pdf`;
}

export async function getStoredQuotePdf(quote: FinancingQuote) {
  if (!quote.pdfStoragePath) {
    throw new QuotePdfError(
      "QUOTE_STORAGE_FILE_NOT_FOUND",
      "Quote PDF has not been generated.",
    );
  }

  const expectedPath = quotePdfStoragePath(quote);
  if (quote.pdfStoragePath !== expectedPath) {
    throw new QuotePdfError(
      "QUOTE_STORAGE_METADATA_INVALID",
      "Quote PDF storage path is inconsistent.",
    );
  }

  const bucketName = quoteStorageBucketName();
  if (!bucketName) {
    throw new QuotePdfError(
      "QUOTE_STORAGE_BUCKET_MISSING",
      "Quote storage bucket is not configured.",
    );
  }

  const file = getAdminStorage().bucket(bucketName).file(expectedPath);
  let metadata: QuoteStorageMetadata;

  try {
    [metadata] = await file.getMetadata();
  } catch {
    throw new QuotePdfError(
      "QUOTE_STORAGE_FILE_NOT_FOUND",
      "Quote PDF file was not found in secure storage.",
    );
  }

  const size = Number(metadata.size);
  const ownerUid = quoteOwnerUid(quote);
  const customMetadata = metadata.metadata ?? {};
  if (
    metadata.contentType !== "application/pdf" ||
    !Number.isInteger(size) ||
    size <= 0 ||
    size > maxQuotePdfFileSize ||
    customMetadata.quoteId !== quote.id ||
    customMetadata.uid !== ownerUid
  ) {
    throw new QuotePdfError(
      "QUOTE_STORAGE_METADATA_INVALID",
      "Quote PDF storage metadata is invalid.",
    );
  }

  return { file, size, bucketName, storagePath: expectedPath };
}

export async function generateQuotePdfBuffer(quote: FinancingQuote) {
  const simulation = validateQuoteForPdf(quote);

  try {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const currency = simulation.targetCurrency;

    page.drawRectangle({ x: 0, y: 790, width: 595, height: 52, color: navy });
    page.drawText("AVI CERTIFY", { x: 42, y: 810, size: 18, font: bold, color: rgb(1, 1, 1) });
    page.drawText(pdfText(quote.title ?? "Devis prefinancement mobilite etudiante"), {
      x: 42,
      y: 770,
      size: 20,
      font: bold,
      color: navy,
    });
    page.drawText(pdfText(`Quote ID: ${quote.id}`), { x: 42, y: 744, size: 10, font, color: gray });
    page.drawText(pdfText(`Date: ${new Date().toLocaleDateString("fr-FR")}`), {
      x: 420,
      y: 744,
      size: 10,
      font,
      color: gray,
    });

    const rows = [
      line("Client", pdfText(quote.clientIdentity?.fullName)),
      line("Email", pdfText(quote.clientIdentity?.email)),
      line("Dossier", pdfText(quote.caseId ?? simulation.input.caseId)),
      line("Emission", pdfText(new Date().toLocaleDateString("fr-FR"))),
      line("Validite", pdfText(quote.validUntil ?? quote.expiresAt ?? "A confirmer")),
      line("Echeance paiement", pdfText(quote.paymentDeadline ?? "A confirmer")),
      line("Region", simulation.region === "canada" ? "Canada" : "UE / France"),
      line("Option", pdfText(simulation.option)),
      line("Montant cible", money(simulation.targetAmount, currency)),
      line("Contribution client", money(simulation.studentContribution, currency)),
      line("AVI financee", money(simulation.financedAmount, currency)),
      line("Cash signature", money(simulation.cashDueAtSignature, currency)),
      line("Mensualite", money(simulation.monthlyRepayment, currency)),
      line("Frais nets", money(simulation.netFees, currency)),
      line("Effort total client", money(simulation.totalClientEffort, currency)),
    ];

    let y = 704;
    for (const row of rows) {
      page.drawText(pdfText(row), {
        x: 42,
        y,
        size: 11,
        font,
        color: y > 650 ? navy : gray,
      });
      y -= 24;
    }

    page.drawRectangle({
      x: 42,
      y: y - 18,
      width: 510,
      height: 96,
      borderColor: green,
      borderWidth: 1,
    });
    page.drawText("Recommendation commerciale", {
      x: 58,
      y: y + 50,
      size: 12,
      font: bold,
      color: green,
    });
    y = drawWrappedText({
      page,
      text:
        quote.recommendationSummary ??
        "Valider le dossier et les pieces justificatives avant toute emission finale.",
      x: 58,
      y: y + 31,
      maxChars: 82,
      size: 9,
      font,
      color: gray,
    });

    const requiredDocs = quote.requiredDocumentsBeforeApproval?.filter(Boolean) ?? [];
    y -= 28;
    page.drawText("Documents requis avant validation finale", {
      x: 42,
      y,
      size: 11,
      font: bold,
      color: navy,
    });
    y -= 18;
    if (requiredDocs.length) {
      requiredDocs.slice(0, 6).forEach((item) => {
        page.drawText(pdfText(`- ${item}`), { x: 58, y, size: 9, font, color: gray });
        y -= 14;
      });
    } else {
      page.drawText("A confirmer par l'equipe AVI CERTIFY.", { x: 58, y, size: 9, font, color: gray });
      y -= 14;
    }

    y -= 12;
    page.drawText("Conditions commerciales", { x: 42, y, size: 11, font: bold, color: navy });
    y = drawWrappedText({
      page,
      text:
        quote.termsAndConditions ??
        "Conditions finales confirmees apres revue administrative, documentaire et conformite du dossier.",
      x: 42,
      y: y - 18,
      maxChars: 96,
      size: 8,
      font,
      color: gray,
    });

    page.drawText(pdfText(quote.disclaimer ?? "Ce devis est indicatif et soumis a validation administrative AVI CERTIFY."), {
      x: 42,
      y: 68,
      size: 9,
      font,
      color: gray,
    });
    page.drawText("AVI CERTIFY - documents verifiables - support contact@avicertify.com", {
      x: 42,
      y: 50,
      size: 9,
      font,
      color: gray,
    });

    return Buffer.from(await pdf.save());
  } catch (error) {
    if (error instanceof QuotePdfError) {
      throw error;
    }

    throw new QuotePdfError("QUOTE_PDF_BUILD_FAILED", "Quote PDF build failed.", error);
  }
}

export async function uploadQuotePdf(quote: FinancingQuote, buffer: Buffer) {
  const simulation = validateQuoteForPdf(quote);
  const uid = quoteOwnerUid(quote);
  const storagePath = quotePdfStoragePath(quote);
  const bucketName = quoteStorageBucketName();

  if (!bucketName) {
    throw new QuotePdfError(
      "QUOTE_STORAGE_BUCKET_MISSING",
      "Firebase Storage bucket is not configured.",
    );
  }

  try {
    const file = getAdminStorage().bucket(bucketName).file(storagePath);
    await file.save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        metadata: {
          quoteId: quote.id,
          uid: uid as string,
          caseId: quote.caseId ?? simulation.input.caseId ?? "",
        },
      },
    });

    return { storagePath, size: buffer.length, bucket: bucketName };
  } catch (error) {
    throw new QuotePdfError("QUOTE_STORAGE_UPLOAD_FAILED", "Quote PDF upload failed.", error);
  }
}

export async function storeQuotePdf(quote: FinancingQuote) {
  const buffer = await generateQuotePdfBuffer(quote);
  return uploadQuotePdf(quote, buffer);
}
