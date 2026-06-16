import { NextRequest } from "next/server";
import { AdminApiError, withAdmin } from "@/app/api/admin/fintech/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { QuotePdfError, storeQuotePdf } from "@/lib/fintech/quote-pdf.service";
import { sendQuoteReadyEmail } from "@/lib/server/email.service";
import type { FinancingQuote } from "@/types/fintech";
import type { CommunicationLog } from "@/types/admin-ops";

type DeliveryStatus = NonNullable<FinancingQuote["deliveryStatus"]>;

function fallbackDeliveryStatus(sent: boolean): DeliveryStatus {
  return sent ? "SENT" : "SEND_FAILED";
}

function communicationStatus(status: DeliveryStatus): CommunicationLog["status"] {
  if (status === "SENT") return "SENT";
  if (status === "EMAIL_NOT_CONFIGURED" || status === "RECIPIENT_MISSING") {
    return "NOT_SENT";
  }
  return "FAILED";
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

      let readyQuote = quote;
      if (!readyQuote.pdfStoragePath) {
        let stored: Awaited<ReturnType<typeof storeQuotePdf>>;
        try {
          stored = await storeQuotePdf(quote);
        } catch (error) {
          const code =
            error instanceof QuotePdfError ? error.code : "QUOTE_PDF_BUILD_FAILED";
          console.error("Quote PDF generation failed before email send:", {
            code,
            quoteId: quote.id,
            reason: error instanceof Error ? error.message : "unknown error",
            cause:
              error instanceof QuotePdfError && error.cause instanceof Error
                ? error.cause.message
                : undefined,
          });
          await getFintechStore().updateQuote(quote.id, {
            deliveryStatus: "GENERATING_FAILED",
            deliveryMessage: code,
            lastDeliveryAttemptAt: new Date().toISOString(),
          });
          if (error instanceof QuotePdfError) {
            throw new AdminApiError(
              error.code === "QUOTE_DATA_INVALID" ? 422 : 503,
              error.message,
              error.code,
            );
          }
          throw new AdminApiError(
            503,
            "Le PDF du devis n'a pas pu etre genere avant l'envoi.",
            "QUOTE_PDF_BUILD_FAILED",
          );
        }

        readyQuote = await getFintechStore().updateQuote(quote.id, {
          status: "GENERATED",
          pdfStoragePath: stored.storagePath,
          generatedAt: new Date().toISOString(),
          deliveryStatus: "NOT_SENT",
          deliveryMessage: "PDF_GENERATED_EMAIL_NOT_SENT",
        });
      }

      const dashboardUrl = `${
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        "https://www.avicertify.fr"
      }/dossier/devis`;
      const emailResult = await sendQuoteReadyEmail({
        recipientEmail: readyQuote.clientIdentity.email ?? null,
        clientName: readyQuote.clientIdentity.fullName ?? null,
        quoteId: readyQuote.id,
        dashboardUrl,
      });
      const deliveryStatus =
        (emailResult.status as DeliveryStatus | undefined) ??
        fallbackDeliveryStatus(emailResult.sent);
      const deliveryAttemptAt = new Date().toISOString();
      const updated = await getFintechStore().updateQuote(readyQuote.id, {
        status: emailResult.sent ? "SENT" : "GENERATED",
        sentAt: emailResult.sent ? deliveryAttemptAt : readyQuote.sentAt ?? null,
        deliveryStatus,
        deliveryMessage: deliveryStatus,
        lastDeliveryAttemptAt: deliveryAttemptAt,
        lastEmailMessageId: emailResult.messageId,
      });

      const uid = updated.uid ?? updated.simulationSnapshot.input.uid ?? null;
      await getAdminOperationsStore().createCommunicationLog({
        caseId: updated.caseId ?? null,
        uid,
        type: "EMAIL",
        template: "quote-ready",
        recipient: updated.clientIdentity.email ?? null,
        status: communicationStatus(deliveryStatus),
        provider: "resend",
        messageId: emailResult.messageId,
        subject: "Votre devis AVI CERTIFY est disponible",
        body: `Quote ${updated.id} delivery status: ${deliveryStatus}`,
      });
      await getAdminOperationsStore().createEvent({
        caseId: updated.caseId ?? null,
        uid,
        actorType: "admin",
        actorId: actor.uid,
        actorRole: actor.role,
        eventType: "quote_sent",
        eventLabel: emailResult.sent
          ? "Devis envoye au client"
          : `Tentative envoi devis non aboutie: ${deliveryStatus}`,
        eventPayload: {
          quoteId: updated.id,
          messageId: emailResult.messageId,
          deliveryStatus,
          recipient: updated.clientIdentity.email ?? null,
        },
      });
      if (emailResult.sent && updated.caseId) {
        await getAdminOperationsStore().linkFinancialSimulation(
          updated.caseId,
          {
            simulationId: updated.simulationId,
            quoteId: updated.id,
            productCode:
              updated.simulationSnapshot.region === "canada"
                ? "prefinancement-canada-cad"
                : "prefinancement-ue-eur",
            region: updated.simulationSnapshot.region,
            xafAmount:
              updated.simulationSnapshot.xafEquivalent.targetAmount,
            option: updated.simulationSnapshot.option,
            riskTier: `${Math.round(
              updated.simulationSnapshot.financedShare * 100,
            )}%`,
            status: "SENT",
          },
          actor,
        );
      }

      return {
        quote: updated,
        email: {
          ...emailResult,
          status: deliveryStatus,
        },
      };
    },
    { type: "quote_sent", targetCollection: "financing_quotes" },
  );
}
