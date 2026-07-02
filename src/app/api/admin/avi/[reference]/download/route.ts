import { NextRequest, NextResponse } from "next/server";
import {
  AdminAuthError,
  adminErrorResponse,
  requireAdmin,
} from "@/lib/admin/admin-auth";
import { getStoredManualAviPdf } from "@/lib/avi/manual-avi-pdf.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  try {
    await requireAdmin(request);
    const { reference } = await params;
    const stored = await getStoredManualAviPdf(decodeURIComponent(reference));

    return new NextResponse(new Uint8Array(stored.buffer), {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${stored.fileName}"`,
        "X-Content-Type-Options": "nosniff",
        "X-AVI-Reference": stored.reference,
      },
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return adminErrorResponse(error);
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.message.includes("introuvable") ? 404 : 400,
          headers: {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    return adminErrorResponse(error);
  }
}
