import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";
import { GET } from "./route";

const verifyIdToken = vi.hoisted(() => vi.fn());
const listQuotes = vi.hoisted(() => vi.fn());

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    listQuotes,
  }),
}));

function quote(
  id: string,
  uid: string,
  status: FinancingQuote["status"] = "GENERATED",
): FinancingQuote {
  const simulation = new FinancingSimulationService().simulate({
    region: "canada",
    xafAmount: 8_000_000,
    contributionMonths: 3,
    uid,
    caseId: `case-${uid}`,
  });

  return {
    id,
    createdAt: "2026-06-15T10:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {
      fullName: "Client AVI",
      email: "shared@example.com",
    },
    lineItems: [],
    assumptions: { internal: true },
    simulationSnapshot: simulation,
    status,
    caseId: `case-${uid}`,
    uid,
    pdfStoragePath: `admin/quotes/${uid}/${id}.pdf`,
    internalNote: "Internal only",
    lastEmailMessageId: "resend-message-id",
  };
}

function request(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/client/quotes", { headers });
}

describe("client quote projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: "client-1" });
  });

  it("returns only the authenticated client's public quote fields", async () => {
    listQuotes.mockResolvedValue([
      quote("quote-own", "client-1"),
      quote("quote-other", "client-2"),
      quote("quote-draft", "client-1", "DRAFT"),
    ]);

    const response = await GET(
      request({ authorization: "Bearer client-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.quotes).toHaveLength(1);
    expect(body.quotes[0]).toMatchObject({
      id: "quote-own",
      pdfAvailable: true,
      simulation: {
        region: "canada",
        targetCurrency: "CAD",
      },
    });
    expect(body.quotes[0]).not.toHaveProperty("uid");
    expect(body.quotes[0]).not.toHaveProperty("caseId");
    expect(body.quotes[0]).not.toHaveProperty("pdfStoragePath");
    expect(body.quotes[0]).not.toHaveProperty("internalNote");
    expect(body.quotes[0]).not.toHaveProperty("assumptions");
    expect(body.quotes[0]).not.toHaveProperty("lastEmailMessageId");
    expect(body.quotes[0]).not.toHaveProperty("clientIdentity");
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listQuotes).not.toHaveBeenCalled();
  });

  it("does not misreport a store failure as an authentication failure", async () => {
    listQuotes.mockRejectedValue(new Error("Firestore unavailable"));

    const response = await GET(
      request({ authorization: "Bearer client-token" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Unable to load quotes." });
  });
});
