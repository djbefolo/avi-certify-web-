import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { generateManualAviPdf } from "@/lib/avi/manual-avi-pdf.service";
import { parseManualAviPayload } from "@/lib/validations/avi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxManualAviBodyBytes = 16 * 1024;

class ManualAviRequestError extends Error {
  constructor(
    public readonly status: 400 | 413 | 415,
    message: string,
  ) {
    super(message);
  }
}

function jsonError(
  body: Record<string, unknown>,
  status: 400 | 413 | 415 | 422 | 500,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isJsonRequest(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase();

  return Boolean(
    contentType &&
      (contentType.includes("application/json") ||
        contentType.includes("+json")),
  );
}

async function readBoundedJson(request: NextRequest) {
  if (!isJsonRequest(request)) {
    throw new ManualAviRequestError(
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
      byteLength > maxManualAviBodyBytes
    ) {
      throw new ManualAviRequestError(
        413,
        "La demande AVI envoyee est trop volumineuse.",
      );
    }
  }

  if (!request.body) {
    throw new ManualAviRequestError(400, "Le corps de la requete est invalide.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maxManualAviBodyBytes) {
        await reader.cancel();
        throw new ManualAviRequestError(
          413,
          "La demande AVI envoyee est trop volumineuse.",
        );
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
  } catch (error) {
    if (error instanceof ManualAviRequestError) {
      throw error;
    }

    throw new ManualAviRequestError(400, "Le corps de la requete est invalide.");
  }

  if (!body.trim()) {
    throw new ManualAviRequestError(400, "Le corps de la requete est invalide.");
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ManualAviRequestError(400, "Le corps de la requete est invalide.");
  }
}

function filenameForReference(reference: string) {
  return `${reference.replace(/[^A-Za-z0-9_-]/g, "-")}.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await readBoundedJson(request);
    const payload = parseManualAviPayload(body);
    const pdf = await generateManualAviPdf(payload);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameForReference(payload.aviReference)}"`,
        "X-Content-Type-Options": "nosniff",
        "X-AVI-Reference": payload.aviReference,
        "X-AVI-Template": payload.templateVersion,
      },
    });
  } catch (error) {
    if (error instanceof ManualAviRequestError) {
      return jsonError({ ok: false, error: error.message }, error.status);
    }

    if (error instanceof ZodError) {
      return jsonError(
        {
          ok: false,
          error: "Payload AVI invalide.",
          details: error.flatten().fieldErrors,
        },
        400,
      );
    }

    return adminErrorResponse(error);
  }
}

