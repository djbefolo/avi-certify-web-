import { NextRequest } from "next/server";
import { withAdminOps } from "@/app/api/admin/_utils";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";

export async function GET(request: NextRequest) {
  return withAdminOps(request, async () => {
    const { searchParams } = request.nextUrl;
    const store = getAdminOperationsStore();
    const clients = await store.listClients({
      status: searchParams.get("status"),
      productType: searchParams.get("productType"),
      country: searchParams.get("country"),
      missingDocuments: searchParams.get("missingDocuments"),
      paymentStatus: searchParams.get("paymentStatus"),
      query: searchParams.get("query"),
    });
    const overview = await store.overview();

    return { clients, overview };
  });
}
