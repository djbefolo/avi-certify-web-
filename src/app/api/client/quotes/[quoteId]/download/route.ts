import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import {
  getStoredQuotePdf,
  QuotePdfError,
} from "@/lib/fintech/quote-pdf.service";
import { quoteOwnerUid } from "@/lib/fintech/quote.service";

async function requireClient(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) throw new Error("Unauthorized");
  return getAdminAuth().verifyIdToken(token, true);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  let user: Awaited<ReturnType<typeof requireClient>>;

  try {
    user = await requireClient(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { quoteId } = await params;
    const quote = await getFintechStore().getQuote(quoteId);
    if (!quote || quoteOwnerUid(quote) !== user.uid) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    if (!["GENERATED", "SENT", "ACCEPTED", "EXPIRED"].includes(quote.status)) {
      return NextResponse.json(
        { error: "Quote PDF is not available to the client." },
        { status: 409 },
      );
    }

    const { file } = await getStoredQuotePdf(quote);
    const [buffer] = await file.download();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${quote.id}.pdf`)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof QuotePdfError) {
      const status =
        error.code === "QUOTE_STORAGE_FILE_NOT_FOUND"
          ? 404
          : error.code === "QUOTE_STORAGE_BUCKET_MISSING"
            ? 503
            : 409;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(
      { error: "Unable to download quote PDF." },
      { status: 500 },
    );
  }
}
