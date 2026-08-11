import { NextRequest } from "next/server";
import { adminOpsJson, readAdminJson } from "@/app/api/admin/_utils";
import {
  AdminLeadValidationError,
  getAdminLeadsStore,
} from "@/lib/admin/admin-leads-store";
import { adminErrorResponse, requireAdmin } from "@/lib/admin/admin-auth";

function leadErrorResponse(error: AdminLeadValidationError) {
  return adminOpsJson(
    {
      error: error.message,
    },
    { status: error.status },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    await requireAdmin(request);
    const { leadId } = await params;
    const lead = await getAdminLeadsStore().getLead(leadId);

    if (!lead) {
      return leadErrorResponse(
        new AdminLeadValidationError("Lead not found.", 404),
      );
    }

    return adminOpsJson({ lead });
  } catch (error) {
    if (error instanceof AdminLeadValidationError) {
      return leadErrorResponse(error);
    }

    return adminErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const actor = await requireAdmin(request);
    const { leadId } = await params;
    const body = await readAdminJson(request);
    const lead = await getAdminLeadsStore().updateLeadCrm(
      leadId,
      body,
      actor,
    );

    return adminOpsJson({ lead });
  } catch (error) {
    if (error instanceof AdminLeadValidationError) {
      return leadErrorResponse(error);
    }

    return adminErrorResponse(error);
  }
}
