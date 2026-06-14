import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AdminAuthError,
  resolveAdminActorFromDecodedToken,
} from "@/lib/admin/admin-auth";
import {
  AdminSessionGuardConfigError,
  createAdminGuardValue,
} from "@/lib/admin/admin-session-guard";
import { FinancialAuditService } from "@/lib/fintech/audit.service";
import { getAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionLoginSchema = z.object({
  idToken: z.string().min(10),
  twoFactorCode: z.string().max(12).optional(),
});

const MAX_ADMIN_AUTH_AGE_SECONDS = 10 * 60;
const SESSION_EXPIRES_IN_MS = 4 * 60 * 60 * 1000;
const SESSION_EXPIRES_IN_SECONDS = SESSION_EXPIRES_IN_MS / 1000;
const RECENT_AUTH_REQUIRED_MESSAGE = "Recent Firebase authentication required.";

function assertRecentAdminAuthentication(authTime: unknown) {
  if (
    typeof authTime !== "number" ||
    !Number.isFinite(authTime) ||
    authTime <= 0 ||
    Math.floor(Date.now() / 1000) - authTime > MAX_ADMIN_AUTH_AGE_SECONDS
  ) {
    throw new AdminAuthError(401, RECENT_AUTH_REQUIRED_MESSAGE);
  }
}

function requestContext(request: NextRequest) {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

async function safeAudit(input: {
  actor: string;
  actorLabel?: string;
  action: "admin_access_granted" | "admin_access_denied";
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await new FinancialAuditService().record({
      type: "admin_access",
      action: input.action,
      actor: input.actor,
      actorLabel: input.actorLabel,
      actorRole: input.action === "admin_access_granted" ? "admin" : "unknown",
      targetCollection: "admin_session",
      resourceType: "admin_session",
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: input.metadata,
    });
  } catch {
    // Login must not leak audit infrastructure details to the browser.
  }
}

export async function POST(request: NextRequest) {
  const context = requestContext(request);

  try {
    const body = sessionLoginSchema.parse(await request.json());
    const decodedToken = await getAdminAuth().verifyIdToken(body.idToken, true);
    const actor = await resolveAdminActorFromDecodedToken(decodedToken, "firebase");
    assertRecentAdminAuthentication(decodedToken.auth_time);
    const expiresAt = Date.now() + SESSION_EXPIRES_IN_MS;
    const guardCookie = await createAdminGuardValue({
      uid: actor.uid,
      role: actor.role,
      exp: expiresAt,
    });
    const sessionCookie = await getAdminAuth().createSessionCookie(body.idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });
    const response = NextResponse.json(
      {
        ok: true,
        actor: {
          uid: actor.uid,
          email: actor.email,
          role: actor.role,
        },
        twoFactor: {
          required: false,
          prepared: true,
          methods: ["totp"],
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
    const secure = process.env.NODE_ENV === "production";

    response.cookies.set("avi_admin_session", sessionCookie, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_SECONDS,
    });
    response.cookies.set("avi_admin_guard", guardCookie, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_EXPIRES_IN_SECONDS,
    });

    await safeAudit({
      actor: actor.uid,
      actorLabel: actor.email,
      action: "admin_access_granted",
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        source: "admin_session_login",
        role: actor.role,
        twoFactorPrepared: true,
      },
    });

    return response;
  } catch (error) {
    const isMissingAdminClaim =
      error instanceof AdminAuthError && error.status === 403;
    const isRecentAuthRequired =
      error instanceof AdminAuthError &&
      error.message === RECENT_AUTH_REQUIRED_MESSAGE;
    const isServerConfigProblem =
      error instanceof AdminSessionGuardConfigError ||
      (error instanceof Error &&
        error.message.includes("Missing required Firebase Admin env var"));
    const status = isMissingAdminClaim ? 403 : isServerConfigProblem ? 503 : 401;
    const errorCode = isMissingAdminClaim
      ? "ADMIN_CLAIM_REQUIRED"
      : isRecentAuthRequired
        ? "ADMIN_RECENT_AUTH_REQUIRED"
      : isServerConfigProblem
        ? "ADMIN_AUTH_CONFIG_UNAVAILABLE"
        : "INVALID_ADMIN_CREDENTIALS";
    const errorMessage = isMissingAdminClaim
      ? "Authenticated Firebase user is missing AVI CERTIFY admin claims."
      : isRecentAuthRequired
        ? "Recent Firebase authentication is required for admin access."
      : isServerConfigProblem
        ? "Admin authentication configuration is unavailable."
        : "Invalid admin credentials or expired Firebase token.";

    await safeAudit({
      actor: "admin-login-attempt",
      action: "admin_access_denied",
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        source: "admin_session_login",
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    return NextResponse.json(
      { error: errorMessage, code: errorCode },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
}
