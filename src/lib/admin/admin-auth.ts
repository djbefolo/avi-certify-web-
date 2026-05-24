import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export type AdminRole = "admin" | "super_admin";

export type AdminActor = {
  uid: string;
  email?: string;
  role: AdminRole;
  authProvider: "dev-token" | "firebase" | "firebase-session";
};

export class AdminAuthError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
  }
}

function normalizeAdminRole(role: unknown): AdminRole | null {
  return role === "admin" || role === "super_admin" ? role : null;
}

function isFirebaseConfigError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("Missing required Firebase Admin env var")
  );
}

export async function resolveAdminActorFromDecodedToken(
  decodedToken: DecodedIdToken,
  authProvider: AdminActor["authProvider"] = "firebase",
): Promise<AdminActor> {
  const roleClaim = normalizeAdminRole(decodedToken.role ?? decodedToken.adminRole);
  let role = roleClaim;

  if (!role && decodedToken.admin === true) {
    role = "admin";
  }

  if (!role) {
    const userSnapshot = await getAdminFirestore()
      .collection("users")
      .doc(decodedToken.uid)
      .get();
    role = normalizeAdminRole(userSnapshot.data()?.role);
  }

  if (!role) {
    throw new AdminAuthError(403, "Admin role required.");
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role,
    authProvider,
  };
}

export async function requireAdmin(request: NextRequest): Promise<AdminActor> {
  const devToken = request.headers.get("x-admin-dev-token");
  const configuredDevToken = process.env.ADMIN_FINTECH_DEV_TOKEN;
  const isDevTokenAllowed =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (
    isDevTokenAllowed &&
    devToken &&
    (devToken === "avi-local-admin" ||
      (configuredDevToken && devToken === configuredDevToken))
  ) {
    return {
      uid: "local-admin",
      email: "local-admin@avicertify.local",
      role: "admin",
      authProvider: "dev-token",
    };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const sessionCookie = request.cookies.get("avi_admin_session")?.value;

  if (!token && !sessionCookie) {
    throw new AdminAuthError(401, "Admin authentication required.");
  }

  try {
    if (token) {
      const decodedToken = await getAdminAuth().verifyIdToken(token);

      return resolveAdminActorFromDecodedToken(decodedToken, "firebase");
    }

    const decodedSession = await getAdminAuth().verifySessionCookie(
      sessionCookie as string,
      true,
    );

    return resolveAdminActorFromDecodedToken(decodedSession, "firebase-session");
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
    }

    if (!isFirebaseConfigError(error) && sessionCookie) {
      throw new AdminAuthError(401, "Admin session is invalid or expired.");
    }

    throw new AdminAuthError(
      503,
      "Admin authentication is unavailable. Check Firebase Admin configuration.",
    );
  }
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return NextResponse.json(
    { error: "Unexpected admin fintech error." },
    { status: 500 },
  );
}
