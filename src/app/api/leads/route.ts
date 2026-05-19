import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  sendAdminNewLeadEmail,
  sendLeadConfirmationEmail,
} from "@/lib/server/email.service";
import { createLead, validateLead } from "@/lib/server/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAD_SOURCE = "landing_page";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_LEAD_BODY_BYTES = 10 * 1024;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

class RequestBodyError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415,
    message: string,
  ) {
    super(message);
  }
}

function jsonResponse(body: unknown, init: ResponseInit) {
  const headers = new Headers(init.headers);

  headers.set("Allow", "POST");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function checkRateLimit(ipAddress: string) {
  const now = Date.now();
  const currentEntry = rateLimitStore.get(ipAddress);

  if (!currentEntry || currentEntry.resetAt <= now) {
    rateLimitStore.set(ipAddress, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (currentEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((currentEntry.resetAt - now) / 1000),
    };
  }

  currentEntry.count += 1;

  return { allowed: true, retryAfterSeconds: 0 };
}

function cleanExpiredRateLimitEntries() {
  const now = Date.now();

  for (const [ipAddress, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(ipAddress);
    }
  }
}

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase();

  return Boolean(
    contentType &&
      (contentType.includes("application/json") ||
        contentType.includes("+json")),
  );
}

function assertReasonableBodySize(request: NextRequest) {
  const contentLength = request.headers.get("content-length");

  if (!contentLength) {
    return;
  }

  const byteLength = Number(contentLength);

  if (
    !Number.isFinite(byteLength) ||
    byteLength < 0 ||
    byteLength > MAX_LEAD_BODY_BYTES
  ) {
    throw new RequestBodyError(
      413,
      "La demande envoyee est trop volumineuse.",
    );
  }
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  if (!isJsonRequest(request)) {
    throw new RequestBodyError(
      415,
      "Le contenu de la requete doit etre au format JSON.",
    );
  }

  assertReasonableBodySize(request);

  if (!request.body) {
    throw new RequestBodyError(400, "Le corps de la requete est invalide.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      receivedBytes += value.byteLength;

      if (receivedBytes > MAX_LEAD_BODY_BYTES) {
        await reader.cancel();
        throw new RequestBodyError(
          413,
          "La demande envoyee est trop volumineuse.",
        );
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
  } catch (error) {
    if (error instanceof RequestBodyError) {
      throw error;
    }

    throw new RequestBodyError(400, "Le corps de la requete est invalide.");
  }

  if (!body.trim()) {
    throw new RequestBodyError(400, "Le corps de la requete est invalide.");
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new RequestBodyError(400, "Le corps de la requete est invalide.");
  }
}

export async function POST(request: NextRequest) {
  cleanExpiredRateLimitEntries();

  const ipAddress = getClientIp(request);
  const rateLimit = checkRateLimit(ipAddress);

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        error:
          "Trop de demandes ont ete envoyees. Veuillez reessayer dans quelques instants.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const body = await readJsonBody(request);
    const lead = validateLead(body);
    const receivedAt = Date.now();
    const result = await createLead({
      ...lead,
      source: LEAD_SOURCE,
      receivedAt,
      requestContext: {
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      },
    });

    await Promise.all([
      sendLeadConfirmationEmail(lead),
      sendAdminNewLeadEmail({
        ...lead,
        id: result.id,
        receivedAt,
      }),
    ]);

    return jsonResponse(
      {
        id: result.id,
        message: "Lead created.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }

    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: "Les informations envoyees sont invalides.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    console.error("[api/leads] Failed to create lead", error);

    return jsonResponse(
      {
        error:
          "Impossible d'enregistrer la demande pour le moment. Veuillez reessayer plus tard.",
      },
      { status: 500 },
    );
  }
}
