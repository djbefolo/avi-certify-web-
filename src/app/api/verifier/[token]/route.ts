import { NextRequest, NextResponse } from "next/server";
import { getPublicCertificateVerificationByToken } from "@/lib/certificates/certificate-workflow.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const certificate = await getPublicCertificateVerificationByToken(token);

  if (!certificate) {
    return NextResponse.json(
      { certificate: null },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  return NextResponse.json(
    { certificate },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
