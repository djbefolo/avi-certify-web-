import { NextRequest } from "next/server";
import { getFintechStore } from "@/lib/fintech/fintech-store";
import { fintechJson, withAdmin } from "@/app/api/admin/fintech/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, async () => {
    const { id } = await params;
    const simulation = await getFintechStore().getSimulation(id);

    if (!simulation) {
      return fintechJson({ error: "Simulation not found." }, { status: 404 });
    }

    return { simulation };
  });
}
