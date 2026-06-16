import { NextRequest } from "next/server";
import { serveAdminQuotePdf } from "@/app/api/admin/fintech/quotes/[quoteId]/_file";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const { quoteId } = await params;
  return serveAdminQuotePdf(request, quoteId, "inline");
}
