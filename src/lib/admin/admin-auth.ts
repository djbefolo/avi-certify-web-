import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";

export type AdminActor = {
  uid: string;
  email?: string;
  role: "admin";
  authProvider: "dev-token" | "firebase";
};

export class AdminAuthError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
  }
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

  if (!token) {
    throw new AdminAuthError(401, "Admin authentication required.");
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const roleClaim = decodedToken.role ?? decodedToken.adminRole;
    let isAdmin = roleClaim === "admin" || decodedToken.admin === true;

    if (!isAdmin) {
      const userSnapshot = await getAdminFirestore()
        .collection("users")
        .doc(decodedToken.uid)
        .get();
      isAdmin = userSnapshot.data()?.role === "admin";
    }

    if (!isAdmin) {
      throw new AdminAuthError(403, "Admin role required.");
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: "admin",
      authProvider: "firebase",
    };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      throw error;
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
