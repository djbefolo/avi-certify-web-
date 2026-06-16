import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { FinancialAuditService } from "@/lib/fintech/audit.service";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type { AuditEventType } from "@/types/fintech";

export class AdminApiError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409 | 422 | 503,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

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

  if (error instanceof AdminApiError) {
    return fintechJson(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
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
  const auditService = new FinancialAuditService();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;

  async function safeAudit(input: Parameters<FinancialAuditService["record"]>[0]) {
    try {
      await auditService.record(input);
    } catch (error) {
      console.error(
        "Admin financial audit write failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  try {
    const actor = await requireAdmin(request);
    await safeAudit({
      type: "admin_access",
      action: "admin_access_granted",
      actor: actor.uid,
      actorLabel: actor.email,
      actorRole: actor.role,
      targetCollection: "admin_fintech_api",
      resourceType: request.nextUrl.pathname,
      ip,
      userAgent,
      metadata: {
        method: request.method,
        authProvider: actor.authProvider,
      },
    });

    const result = await handler(actor);

    if (audit) {
      const resourceId = extractResourceId(result);

      await safeAudit({
        type: audit.type,
        actor: actor.uid,
        actorLabel: actor.email,
        actorRole: actor.role,
        targetCollection: audit.targetCollection,
        targetId: audit.targetId ?? resourceId,
        resourceType: audit.targetCollection,
        resourceId: audit.targetId ?? resourceId,
        ip,
        userAgent,
        metadata: audit.metadata,
      });
    }

    return fintechJson(result);
  } catch (error) {
    await safeAudit({
      type: "admin_access",
      action: "admin_access_denied",
      actor: "unauthenticated-or-forbidden",
      actorRole: "unknown",
      targetCollection: "admin_fintech_api",
      resourceType: request.nextUrl.pathname,
      ip,
      userAgent,
      metadata: {
        method: request.method,
        reason: error instanceof Error ? error.message : "unknown error",
      },
    });

    return routeError(error);
  }
}

function extractResourceId(result: unknown): string | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const body = result as Record<string, unknown>;
  for (const key of ["simulation", "quote", "report", "fxRate", "pricingRule", "riskRule"]) {
    const value = body[key];

    if (value && typeof value === "object" && "id" in value) {
      const id = (value as { id?: unknown }).id;

      if (typeof id === "string") {
        return id;
      }
    }
  }

  return undefined;
}
