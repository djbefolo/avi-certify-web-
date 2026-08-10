import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/admin/admin-auth";
import { housingAdminErrorResponse } from "@/app/api/admin/housing/_utils";
import { processHousingCertificateJob } from "@/lib/certificates/certificate-workflow.service";
import { approveHousingAllocation } from "@/lib/housing/housing-request.service";
import { housingAllocationInputSchema } from "@/lib/validations/housing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { requestId } = await params;
    const input = housingAllocationInputSchema.parse(await request.json());
    const housingRequest = await approveHousingAllocation({
      requestId,
      input,
      actor,
    });
    const certificate = await processHousingCertificateJob({
      housingRequestId: requestId,
      actor,
    });

    return NextResponse.json(
      { housingRequest, certificate },
      { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "HOUSING_ALLOCATION_INVALID",
          details: error.flatten().fieldErrors,
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return housingAdminErrorResponse(error);
  }
}
