import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import { sendWelcomeEmail } from "@/lib/server/email.service";
import {
  createUserProfile,
  validateUserProfile,
} from "@/lib/server/users.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROFILE_BODY_BYTES = 4 * 1024;

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

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
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
      byteLength > MAX_PROFILE_BODY_BYTES
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

      if (receivedBytes > MAX_PROFILE_BODY_BYTES) {
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

function isAuthTokenError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return jsonResponse(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const body = await readJsonBody(request);
    const profile = validateUserProfile({
      ...(typeof body === "object" && body !== null ? body : {}),
      uid: decodedToken.uid,
      email: decodedToken.email,
    });

    const result = await createUserProfile(profile);

    if (result.created) {
      await sendWelcomeEmail({
        email: profile.email,
        fullName: profile.fullName,
      });
    }

    return jsonResponse(
      {
        id: profile.uid,
        message: "User profile created.",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }

    if (isAuthTokenError(error)) {
      return jsonResponse(
        { error: "Session invalide ou expiree." },
        { status: 401 },
      );
    }

    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: "Les informations du profil sont invalides.",
          details: error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    console.error("[api/users/create-profile] Failed to create profile", error);

    return jsonResponse(
      {
        error:
          "Impossible de creer le profil utilisateur pour le moment. Veuillez reessayer.",
      },
      { status: 500 },
    );
  }
}
