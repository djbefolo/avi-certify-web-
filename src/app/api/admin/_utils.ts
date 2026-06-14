import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin, type AdminActor } from "@/lib/admin/admin-auth";

export const adminOpsHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function adminOpsJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...adminOpsHeaders,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

export async function readAdminJson(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function withAdminOps<T>(
  request: NextRequest,
  handler: (actor: AdminActor) => Promise<T>,
) {
  try {
    const actor = await requireAdmin(request);
    const result = await handler(actor);

    return adminOpsJson(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
