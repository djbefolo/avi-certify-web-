import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { FinancialAuditService } from "@/lib/fintech/audit.service";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type { AuditEventType } from "@/types/fintech";

export const fintechApiHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function fintechJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...fintechApiHeaders,
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });
}

export async function readJson(request: NextRequest) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return {};
  }
}

export function routeError(error: unknown) {
  if (error instanceof ZodError) {
    return fintechJson(
      {
        error: "Invalid fintech request.",
        details: error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  return adminErrorResponse(error);
}

export async function withAdmin<T>(
  request: NextRequest,
  handler: (actor: AdminActor) => Promise<T>,
  audit?: {
    type: AuditEventType;
    targetCollection: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const actor = await requireAdmin(request);
    const result = await handler(actor);

    if (audit) {
      await new FinancialAuditService().record({
        type: audit.type,
        actor: actor.uid,
        targetCollection: audit.targetCollection,
        targetId: audit.targetId,
        metadata: audit.metadata,
      });
    }

    return fintechJson(result);
  } catch (error) {
    return routeError(error);
  }
}
