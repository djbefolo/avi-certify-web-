import { NextRequest } from "next/server";
import { readAdminJson, withAdminOps } from "@/app/api/admin/_utils";
import { generateHousingCertificateForCase } from "@/lib/certificates/certificate-workflow.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const certificateType =
      typeof body.certificateType === "string"
        ? body.certificateType
        : "accommodation_certificate";

    if (certificateType !== "accommodation_certificate") {
      throw new Error("Unsupported certificate type.");
    }

    return generateHousingCertificateForCase({
      caseId,
      actor,
      housingRegion:
        typeof body.housingRegion === "string" ? body.housingRegion : null,
    });
  });
}
