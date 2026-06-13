import { NextRequest } from "next/server";
import { serveAdminDocumentFile } from "@/app/api/admin/documents/[documentId]/_file";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  return serveAdminDocumentFile(request, documentId);
}
