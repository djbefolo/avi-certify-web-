import { NextRequest } from "next/server";
import { AdminApiError, readJson, withAdmin } from "@/app/api/admin/fintech/_utils";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { quotePatchSchema } from "@/lib/fintech/validation";
import type { FinancingQuote } from "@/types/fintech";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  return withAdmin(request, async () => {
    const { quoteId } = await params;
    const quote = await getFintechStore().getQuote(quoteId);

    if (!quote) {
      throw new AdminApiError(404, "Devis introuvable.", "QUOTE_NOT_FOUND");
    }

    return { quote };
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  return withAdmin(
    request,
    async () => {
      const { quoteId } = await params;
      const existing = await getFintechStore().getQuote(quoteId);

      if (!existing) {
        throw new AdminApiError(404, "Devis introuvable.", "QUOTE_NOT_FOUND");
      }

      const input = quotePatchSchema.parse(await readJson(request));
      const now = new Date().toISOString();
      const patch: Partial<FinancingQuote> = {
        ...input,
        expiresAt: input.expiresAt ?? input.validUntil ?? existing.expiresAt ?? null,
      };

      if (input.status === "EXPIRED") {
        patch.deliveryMessage = "QUOTE_EXPIRED";
      }

      const quote = await getFintechStore().updateQuote(quoteId, {
        ...patch,
        assumptions: {
          ...existing.assumptions,
          commercialUpdatedAt: now,
        },
      });

      return { quote };
    },
    { type: "quote_updated", targetCollection: "financing_quotes" },
  );
}
