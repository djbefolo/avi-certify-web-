import { NextRequest } from "next/server";
import { adminOpsJson, readAdminJson } from "@/app/api/admin/_utils";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";
import { AdminLeadValidationError } from "@/lib/admin/admin-leads-store";
import { addProspectInternalNote } from "@/lib/admin/admin-prospect-360";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { leadId } = await params;
    const body = await readAdminJson(request);
    const note = await addProspectInternalNote(leadId, body.note, actor);
    return adminOpsJson({ note }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminLeadValidationError) {
      return adminOpsJson({ error: error.message }, { status: error.status });
    }
    return adminErrorResponse(error);
  }
}
