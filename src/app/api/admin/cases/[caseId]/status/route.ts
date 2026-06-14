import { NextRequest } from "next/server";
import { withAdminOps, readAdminJson } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { AdminCaseStatus } from "@/types/admin-ops";

const allowedStatuses: AdminCaseStatus[] = [
  "NEW",
  "PROFILE_INCOMPLETE",
  "DOCUMENTS_PENDING",
  "DOCUMENTS_SUBMITTED",
  "UNDER_REVIEW",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "FINANCE_SIMULATED",
  "QUOTE_GENERATED",
  "REPORT_GENERATED",
  "AVI_READY",
  "CERTIFICATE_GENERATED",
  "COMPLETED",
  "BLOCKED",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return withAdminOps(request, async (actor) => {
    const { caseId } = await params;
    const body = await readAdminJson(request);
    const status = body.status as AdminCaseStatus;

    if (!allowedStatuses.includes(status)) {
      throw new Error("Invalid case status.");
    }

    const clientCase = await getAdminOperationsStore().updateCaseStatus(
      caseId,
      status,
      actor,
    );

    return { case: clientCase };
  });
}
