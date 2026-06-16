import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancialAuditEvent, FinancingQuote } from "@/types/fintech";

const simulation = new FinancingSimulationService().simulate({
  region: "canada",
  xafAmount: 8_000_000,
  contributionMonths: 3,
  clientName: "Client Quote Workspace",
  clientEmail: "client@example.com",
  uid: "uid_quote_route",
  caseId: "case_quote_route",
});

const createdQuotes: FinancingQuote[] = [];
const createdAuditEvents: FinancialAuditEvent[] = [];
const linkFinancialSimulation = vi.fn();
const getCase = vi.fn();

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    getCase,
    linkFinancialSimulation,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    getSimulation: vi.fn(async (id: string) => (id === simulation.id ? simulation : null)),
    createQuote: vi.fn(async (quote: FinancingQuote) => {
      createdQuotes.unshift(quote);
      return quote;
    }),
    listQuotes: vi.fn(async () => createdQuotes),
    createAuditEvent: vi.fn(async (event: FinancialAuditEvent) => {
      createdAuditEvents.unshift(event);
      return event;
    }),
  }),
}));

function request(body: unknown) {
  return new NextRequest("http://localhost/api/admin/fintech/quotes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
    },
    body: JSON.stringify(body),
  });
}

describe("admin fintech quotes collection route", () => {
  beforeEach(() => {
    createdQuotes.length = 0;
    createdAuditEvents.length = 0;
    getCase.mockReset();
    linkFinancialSimulation.mockReset();
    getCase.mockResolvedValue({
      id: "case_quote_route",
      uid: "uid_quote_route",
      caseNumber: "AVI-QUOTE-1",
      clientName: "Client Quote Workspace",
      clientEmail: "client@example.com",
    });
    linkFinancialSimulation.mockResolvedValue({ id: "finance-1" });
  });

  it("creates a quote from an existing saved simulation without changing the simulation outputs", async () => {
    const { POST } = await import("./route");

    const quoteResponse = await POST(
      request({
        simulationId: simulation.id,
        clientIdentity: {
          fullName: "Client Quote Workspace",
          email: "client@example.com",
        },
      }),
    );
    const quoteBody = (await quoteResponse.json()) as { quote: FinancingQuote };

    expect(quoteResponse.status).toBe(200);
    expect(quoteBody.quote.simulationId).toBe(simulation.id);
    expect(quoteBody.quote.simulationSnapshot.monthlyRepayment).toBe(
      simulation.monthlyRepayment,
    );
    expect(quoteBody.quote.status).toBe("DRAFT");
    expect(quoteBody.quote.deliveryStatus).toBe("PDF_MISSING");
    expect(quoteBody.quote.title).toMatch(/Devis AVI CERTIFY/);
    expect(linkFinancialSimulation).toHaveBeenCalledWith(
      "case_quote_route",
      expect.objectContaining({
        simulationId: simulation.id,
        quoteId: quoteBody.quote.id,
        status: "QUOTED",
      }),
      expect.objectContaining({ uid: "local-admin" }),
    );
  });

  it("requires either a saved simulation id or a simulation input", async () => {
    const { POST } = await import("./route");

    const quoteResponse = await POST(
      request({
        clientIdentity: {
          email: "client@example.com",
        },
      }),
    );
    const body = (await quoteResponse.json()) as { error: string };

    expect(quoteResponse.status).toBe(400);
    expect(body.error).toBe("Invalid fintech request.");
  });
});
