import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import {
  quoteOwnerUid,
  toClientQuoteView,
} from "@/lib/fintech/quote.service";

async function requireClient(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token) throw new Error("Unauthorized");
  return getAdminAuth().verifyIdToken(token, true);
}

export async function GET(request: NextRequest) {
  let user: Awaited<ReturnType<typeof requireClient>>;

  try {
    user = await requireClient(request);
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  try {
    const quotes = (await getFintechStore().listQuotes())
      .filter(
        (quote) =>
          ["GENERATED", "SENT", "ACCEPTED", "EXPIRED"].includes(quote.status) &&
          quoteOwnerUid(quote) === user.uid,
      )
      .map(toClientQuoteView);

    return NextResponse.json(
      { quotes },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load quotes." },
      {
        status: 500,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
