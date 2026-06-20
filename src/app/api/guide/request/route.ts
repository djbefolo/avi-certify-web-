import { NextRequest, NextResponse } from "next/server";
import {
  captureLead,
  LeadCaptureError,
} from "@/lib/server/lead-capture.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_GUIDE_REQUEST_BODY_BYTES = 10 * 1024;

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

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase();

  return Boolean(
    contentType &&
      (contentType.includes("application/json") ||
        contentType.includes("+json")),
  );
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
  if (!isJsonRequest(request)) {
    throw new RequestBodyError(
      415,
      "Le contenu de la requete doit etre au format JSON.",
    );
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const byteLength = Number(contentLength);

    if (
      !Number.isFinite(byteLength) ||
      byteLength < 0 ||
      byteLength > MAX_GUIDE_REQUEST_BODY_BYTES
    ) {
      throw new RequestBodyError(
        413,
        "La demande envoyee est trop volumineuse.",
      );
    }
  }

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

      if (receivedBytes > MAX_GUIDE_REQUEST_BODY_BYTES) {
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
  try {
    const body = await readJsonBody(request);
    const payload =
      typeof body === "object" && body !== null
        ? { ...body, source: "guide" }
        : { source: "guide" };
    const result = await captureLead(payload);

    return jsonResponse(
      {
        ok: true,
        leadId: result.id,
        status: result.status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof LeadCaptureError) {
      return jsonResponse(
        { ok: false, error: error.message, details: error.details },
        { status: 400 },
      );
    }

    console.error("[api/guide/request] Failed to capture guide lead", error);

    return jsonResponse(
      {
        ok: false,
        error:
          "Impossible d'enregistrer la demande de guide pour le moment.",
      },
      { status: 500 },
    );
  }
}
