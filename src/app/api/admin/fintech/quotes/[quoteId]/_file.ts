import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import {
  getStoredQuotePdf,
  QuotePdfError,
} from "@/lib/fintech/quote-pdf.service";

function quoteFileErrorResponse(error: QuotePdfError) {
  const status =
    error.code === "QUOTE_STORAGE_FILE_NOT_FOUND"
      ? 404
      : error.code === "QUOTE_STORAGE_BUCKET_MISSING"
        ? 503
        : error.code === "QUOTE_DATA_INVALID"
          ? 422
          : 409;

  return NextResponse.json(
    { error: error.message, code: error.code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function serveAdminQuotePdf(
  request: NextRequest,
  quoteId: string,
  disposition: "inline" | "attachment",
) {
  try {
    await requireAdmin(request);
    const quote = await getFintechStore().getQuote(quoteId);
    if (!quote) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    const { file } = await getStoredQuotePdf(quote);
    const [buffer] = await file.download();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(`${quote.id}.pdf`)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof QuotePdfError) {
      return quoteFileErrorResponse(error);
    }
    return adminErrorResponse(error);
  }
}
