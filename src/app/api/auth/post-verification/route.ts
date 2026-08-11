import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { completePostVerification } from "@/lib/server/onboarding.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, init: ResponseInit) {
  const headers = new Headers(init.headers);

  headers.set("Allow", "POST");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");

  return NextResponse.json(body, { ...init, headers });
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function isAuthTokenError(error: unknown) {
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
    return jsonResponse({ error: "Authentification requise." }, { status: 401 });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);

    if (decodedToken.email_verified !== true) {
      return jsonResponse(
        { error: "La verification email est requise." },
        { status: 403 },
      );
    }

    if (typeof decodedToken.email !== "string" || !decodedToken.email.trim()) {
      return jsonResponse(
        { error: "Aucune adresse email verifiee n'est disponible." },
        { status: 400 },
      );
    }

    const result = await completePostVerification({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    });

    return jsonResponse(result, { status: 200 });
  } catch (error) {
    if (isAuthTokenError(error)) {
      return jsonResponse(
        { error: "Session invalide ou expiree." },
        { status: 401 },
      );
    }

    console.error("[api/auth/post-verification] Transition failed", error);

    return jsonResponse(
      { error: "La verification du compte n'a pas pu etre finalisee." },
      { status: 500 },
    );
  }
}
