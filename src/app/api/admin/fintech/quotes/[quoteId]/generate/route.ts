import { NextRequest } from "next/server";
import { AdminApiError, withAdmin } from "@/app/api/admin/fintech/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { QuotePdfError, storeQuotePdf } from "@/lib/fintech/quote-pdf.service";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type { FinancingQuote } from "@/types/fintech";

function adminErrorForQuotePdf(error: QuotePdfError) {
  const status = error.code === "QUOTE_DATA_INVALID" ? 422 : 503;
  return new AdminApiError(status, error.message, error.code);
}

async function markPdfGenerationFailed(quote: FinancingQuote, code: string) {
  try {
    await getFintechStore().updateQuote(quote.id, {
      deliveryStatus: "GENERATING_FAILED",
      deliveryMessage: code,
      lastDeliveryAttemptAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Quote PDF failure state persistence failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
}

async function persistGeneratedQuoteMetadata(
  quote: FinancingQuote,
  stored: Awaited<ReturnType<typeof storeQuotePdf>>,
  actor: AdminActor,
) {
  const generatedAt = new Date().toISOString();
  let updated: FinancingQuote;

  try {
    updated = await getFintechStore().updateQuote(quote.id, {
      status: "GENERATED",
      pdfStoragePath: stored.storagePath,
      generatedAt,
      deliveryStatus: "NOT_SENT",
      deliveryMessage: "PDF_GENERATED_EMAIL_NOT_SENT",
      lastDeliveryAttemptAt: null,
    });
  } catch (error) {
    console.error(
      "Quote PDF file metadata persistence failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new AdminApiError(
      503,
      "Le PDF a ete cree mais les metadonnees du devis n'ont pas pu etre persistees.",
      "QUOTE_FILE_PERSIST_FAILED",
    );
  }

  const uid = updated.uid ?? updated.simulationSnapshot.input.uid ?? null;

  try {
    await getAdminOperationsStore().createCommunicationLog({
      caseId: updated.caseId ?? null,
      uid,
      type: "SYSTEM",
      template: "quote-pdf-generated",
      recipient: updated.clientIdentity.email ?? null,
      status: "NOT_SENT",
      provider: "system",
      messageId: null,
      subject: "PDF devis genere",
      body: `Quote ${updated.id} PDF generated at ${stored.storagePath}`,
    });
    await getAdminOperationsStore().createEvent({
      caseId: updated.caseId ?? null,
      uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "quote_pdf_generated",
      eventLabel: "PDF devis genere",
      eventPayload: {
        quoteId: updated.id,
        storagePath: stored.storagePath,
        size: stored.size,
        bucket: stored.bucket,
        deliveryStatus: "NOT_SENT",
      },
    });
  } catch (error) {
    console.error(
      "Quote PDF event/log persistence failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new AdminApiError(
      503,
      "Le PDF a ete genere mais la trace operationnelle n'a pas pu etre persistee.",
      "QUOTE_FILE_PERSIST_FAILED",
    );
  }

  return updated;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  return withAdmin(
    request,
    async (actor) => {
      const { quoteId } = await params;
      const quote = await getFintechStore().getQuote(quoteId);
      if (!quote) {
        throw new AdminApiError(404, "Devis introuvable.", "QUOTE_NOT_FOUND");
      }

      let stored: Awaited<ReturnType<typeof storeQuotePdf>>;
      try {
        stored = await storeQuotePdf(quote);
      } catch (error) {
        if (error instanceof QuotePdfError) {
          console.error("Quote PDF generation failed:", {
            code: error.code,
            quoteId: quote.id,
            reason: error.message,
            cause: error.cause instanceof Error ? error.cause.message : undefined,
          });
          await markPdfGenerationFailed(quote, error.code);
          throw adminErrorForQuotePdf(error);
        }

        console.error(
          "Quote PDF generation failed with unknown error:",
          error instanceof Error ? error.message : "unknown error",
        );
        await markPdfGenerationFailed(quote, "QUOTE_PDF_BUILD_FAILED");
        throw new AdminApiError(
          503,
          "Generation PDF devis impossible.",
          "QUOTE_PDF_BUILD_FAILED",
        );
      }

      const updated = await persistGeneratedQuoteMetadata(quote, stored, actor);

      return { quote: updated, file: stored };
    },
    { type: "quote_generated", targetCollection: "financing_quotes" },
  );
}
