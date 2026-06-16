import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";

const service = new FinancingSimulationService();
const simulation = service.simulate({
  region: "canada",
  xafAmount: 8_000_000,
  contributionMonths: 3,
  clientName: "Client AVI",
  clientEmail: "client@example.com",
  uid: "uid_quote_workspace",
  caseId: "case_quote_workspace",
});

let quoteState: FinancingQuote | null = null;

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    getQuote: vi.fn(async (id: string) => (quoteState?.id === id ? quoteState : null)),
    updateQuote: vi.fn(async (id: string, patch: Partial<FinancingQuote>) => {
      if (!quoteState || quoteState.id !== id) {
        throw new Error("Quote not found.");
      }

      quoteState = {
        ...quoteState,
        ...patch,
        assumptions: {
          ...quoteState.assumptions,
          ...patch.assumptions,
        },
      };

      return quoteState;
    }),
  }),
}));

function makeQuote(patch: Partial<FinancingQuote> = {}): FinancingQuote {
  return {
    id: "quote_workspace_test",
    createdAt: "2026-06-02T08:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {
      fullName: "Client AVI",
      email: "client@example.com",
    },
    lineItems: [],
    assumptions: {},
    simulationSnapshot: simulation,
    status: "DRAFT",
    uid: "uid_quote_workspace",
    caseId: "case_quote_workspace",
    deliveryStatus: "PDF_MISSING",
    ...patch,
  };
}

function request(method: "GET" | "PATCH", body?: unknown) {
  return new NextRequest("http://localhost/api/admin/fintech/quotes/quote_workspace_test", {
    method,
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = { params: Promise.resolve({ quoteId: "quote_workspace_test" }) };

describe("quote detail admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quoteState = makeQuote();
  });

  it("returns a protected quote detail payload", async () => {
    const { GET } = await import("./route");

    const response = await GET(request("GET"), params);
    const body = (await response.json()) as { quote: FinancingQuote };

    expect(response.status).toBe(200);
    expect(body.quote.id).toBe("quote_workspace_test");
    expect(body.quote.simulationSnapshot.monthlyRepayment).toBe(simulation.monthlyRepayment);
  });

  it("updates commercial quote fields without changing financial outputs", async () => {
    const { PATCH } = await import("./route");
    const originalMonthly = quoteState?.simulationSnapshot.monthlyRepayment;

    const response = await PATCH(
      request("PATCH", {
        title: "Devis commercial personnalisé",
        validUntil: "2026-07-15",
        paymentDeadline: "2026-06-30",
        commercialNote: "Note client",
        internalNote: "Note admin",
        requiredDocumentsBeforeApproval: ["Passeport", "Lettre admission"],
      }),
      params,
    );
    const body = (await response.json()) as { quote: FinancingQuote };

    expect(response.status).toBe(200);
    expect(body.quote.title).toBe("Devis commercial personnalisé");
    expect(body.quote.validUntil).toBe("2026-07-15");
    expect(body.quote.paymentDeadline).toBe("2026-06-30");
    expect(body.quote.requiredDocumentsBeforeApproval).toEqual(["Passeport", "Lettre admission"]);
    expect(body.quote.simulationSnapshot.monthlyRepayment).toBe(originalMonthly);
  });

  it("marks a quote expired with an operational delivery message", async () => {
    const { PATCH } = await import("./route");

    const response = await PATCH(request("PATCH", { status: "EXPIRED" }), params);
    const body = (await response.json()) as { quote: FinancingQuote };

    expect(response.status).toBe(200);
    expect(body.quote.status).toBe("EXPIRED");
    expect(body.quote.deliveryMessage).toBe("QUOTE_EXPIRED");
  });

  it("returns QUOTE_NOT_FOUND for missing quote records", async () => {
    const { GET } = await import("./route");
    quoteState = null;

    const response = await GET(request("GET"), params);
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(404);
    expect(body.code).toBe("QUOTE_NOT_FOUND");
  });
});
