import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processOnboardingHumanFollowUps } from "@/lib/server/onboarding-human-followup.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authorization);

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return jsonResponse({ error: "Cron indisponible." }, 503);
  }

  if (!isAuthorizedCronRequest(request)) {
    return jsonResponse({ error: "Non autorise." }, 401);
  }

  try {
    const summary = await processOnboardingHumanFollowUps();
    return jsonResponse({ ok: true, ...summary }, 200);
  } catch (error) {
    console.error("[onboarding-human-followup] Cron failed", {
      code:
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "UNEXPECTED_ERROR",
    });
    return jsonResponse(
      { error: "Le traitement des suivis humains a echoue." },
      500,
    );
  }
}
