import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAdminAuth } from "@/lib/firebase/admin";
import {
  franceCountryReference,
  resolveCountryReference,
  resolveNationalityReference,
} from "@/lib/profile/country-reference";
import {
  createOrUpdateHousingRequest,
  getLatestHousingRequestForOwner,
} from "@/lib/housing/housing-request.service";
import { housingRequestInputSchema } from "@/lib/validations/housing";
import type { HousingRequest } from "@/types/housing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireVerifiedClient(request: NextRequest) {
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

function response(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clientHousingRequest(request: HousingRequest | null) {
  if (!request) return null;
  const documentAvailable = Boolean(request.generatedDocumentId);
  const nextAction = documentAvailable
    ? "Télécharger votre attestation"
    : ["draft", "awaiting_payment"].includes(request.status)
      ? "Finaliser le paiement"
      : ["payment_pending", "payment_confirmed", "auto_validation_pending"].includes(
            request.status,
          )
        ? "Attendre la confirmation du paiement"
        : ["requires_admin_review", "admin_review_in_progress", "allocation_pending"].includes(
              request.status,
            )
          ? "Suivre la vérification AVI CERTIFY"
          : "Suivre la préparation du document";
  return {
    id: request.id,
    status: request.status,
    studentFirstName: request.studentFirstName,
    studentLastName: request.studentLastName,
    studentPhone: request.studentPhone,
    studentDateOfBirth: request.studentDateOfBirth,
    studentPlaceOfBirth: request.studentPlaceOfBirth,
    nationality:
      resolveNationalityReference(request.nationalityReference) ??
      resolveNationalityReference(request.nationality),
    originCountry:
      resolveCountryReference(request.originCountryReference) ??
      resolveCountryReference(request.originCountry),
    currentResidenceCountry:
      resolveCountryReference(request.currentResidenceCountryReference) ??
      resolveCountryReference(request.currentResidenceCountry),
    destinationCountry:
      resolveCountryReference(request.destinationCountryReference) ??
      franceCountryReference,
    preferredCityCode: request.preferredCityCode,
    preferredCity: request.preferredCity,
    housingInventoryId: request.housingInventoryId,
    schoolName: request.schoolName,
    schoolCity: request.schoolCity,
    academicYear: request.academicYear,
    expectedArrivalDate: request.expectedArrivalDate,
    expectedStayDurationMonths: request.expectedStayDurationMonths,
    accommodationType: request.accommodationType,
    indicativeMonthlyRent: request.indicativeMonthlyRent,
    currency: request.currency,
    specialNeeds: request.specialNeeds,
    notes: request.notes,
    residenceName: request.selectionSnapshot?.residenceName ?? null,
    documentAvailable,
    documentId: request.generatedDocumentId,
    nextAction,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    paidAt: request.paidAt,
  };
}

function isFirebaseAuthError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("auth/"),
  );
}

export async function GET(request: NextRequest) {
  try {
    const client = await requireVerifiedClient(request);
    return response({
      request: clientHousingRequest(
        await getLatestHousingRequestForOwner(client.uid),
      ),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNAUTHORIZED";
    return response({ error: code }, code === "EMAIL_NOT_VERIFIED" ? 403 : 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await requireVerifiedClient(request);
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json") && !contentType.includes("+json")) {
      return response({ error: "CONTENT_TYPE_NOT_SUPPORTED" }, 415);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 16 * 1024) {
      return response({ error: "PAYLOAD_TOO_LARGE" }, 413);
    }
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
      return response({ error: "PAYLOAD_TOO_LARGE" }, 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return response({ error: "HOUSING_REQUEST_INVALID_JSON" }, 400);
    }
    const input = housingRequestInputSchema.parse(body);
    const housingRequest = await createOrUpdateHousingRequest({
      ownerId: client.uid,
      accountEmail: client.email,
      input,
    });
    return response({ request: clientHousingRequest(housingRequest) }, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return response(
        { error: "HOUSING_REQUEST_INVALID", details: error.flatten().fieldErrors },
        400,
      );
    }
    const code = error instanceof Error ? error.message : "HOUSING_REQUEST_FAILED";
    if (code === "UNAUTHORIZED" || isFirebaseAuthError(error)) {
      return response({ error: "UNAUTHORIZED" }, 401);
    }
    if (code === "EMAIL_NOT_VERIFIED") return response({ error: code }, 403);
    if (
      [
        "HOUSING_INVENTORY_NOT_SELECTABLE",
        "HOUSING_INVENTORY_UNAVAILABLE",
        "HOUSING_INVENTORY_CITY_MISMATCH",
        "HOUSING_ACCOMMODATION_TYPE_NOT_AVAILABLE",
      ].includes(code)
    ) {
      return response(
        { error: code },
        code === "HOUSING_INVENTORY_UNAVAILABLE" ? 503 : 400,
      );
    }
    console.error("[client/housing-request] Request failed", { code });
    return response({ error: code }, 500);
  }
}
