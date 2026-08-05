import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

export async function requireVerifiedHousingClient(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  if (!token) throw new Error("UNAUTHORIZED");
  const decoded = await getAdminAuth().verifyIdToken(token, true);
  if (decoded.email_verified !== true || !decoded.email) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }
  return { uid: decoded.uid, email: decoded.email };
}

export function housingClientErrorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "UNAUTHORIZED";
  const status =
    code === "EMAIL_NOT_VERIFIED"
      ? 403
      : code === "HOUSING_INVENTORY_UNAVAILABLE"
        ? 503
        : code === "UNAUTHORIZED" || code.startsWith("auth/")
          ? 401
          : 500;
  return NextResponse.json(
    { error: code },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    },
  );
}
