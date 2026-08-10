import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { housingAdminErrorResponse } from "@/app/api/admin/housing/_utils";
import { processHousingCertificateJob } from "@/lib/certificates/certificate-workflow.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { requestId } = await params;
    const certificate = await processHousingCertificateJob({
      housingRequestId: requestId,
      actor,
    });
    return NextResponse.json(
      { certificate },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    return housingAdminErrorResponse(error);
  }
}
