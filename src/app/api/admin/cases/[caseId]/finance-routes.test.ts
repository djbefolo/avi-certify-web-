import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import { POST as linkSimulation } from "./link-financial-simulation/route";
import { POST as createQuote } from "./quotes/route";
import { POST as createReport } from "./reports/route";

const getCase = vi.hoisted(() => vi.fn());
const linkFinancialSimulation = vi.hoisted(() => vi.fn());
const createCaseReportDraft = vi.hoisted(() => vi.fn());
const getSimulation = vi.hoisted(() => vi.fn());
const createQuoteMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    getCase,
    linkFinancialSimulation,
    createCaseReportDraft,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    getSimulation,
  }),
}));

vi.mock("@/lib/fintech/quote.service", () => ({
  QuoteService: class {
    createQuote = createQuoteMock;
  },
}));

const simulation = new FinancingSimulationService().simulate({
  region: "canada",
  xafAmount: 8_000_000,
  contributionMonths: 3,
  uid: "client-1",
  caseId: "case-1",
});

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
    },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ caseId: "case-1" }) };

describe("case finance routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCase.mockResolvedValue({
      id: "case-1",
      uid: "client-1",
      clientName: "Trusted Client",
      clientEmail: "trusted@example.com",
    });
    getSimulation.mockResolvedValue(simulation);
    linkFinancialSimulation.mockResolvedValue({ id: "financial-file-1" });
    createCaseReportDraft.mockResolvedValue({ report: { id: "report-1" } });
    createQuoteMock.mockResolvedValue({
      id: "quote-1",
      simulationId: simulation.id,
    });
  });

  it("links a saved simulation using server-derived financial values", async () => {
    const response = await linkSimulation(
      request("/api/admin/cases/case-1/link-financial-simulation", {
        simulationId: simulation.id,
        uid: "forged-client",
        xafAmount: 1,
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(linkFinancialSimulation).toHaveBeenCalledWith(
      "case-1",
      {
        simulationId: simulation.id,
        productCode: "prefinancement-canada-cad",
        region: simulation.region,
        xafAmount: simulation.xafEquivalent.targetAmount,
        option: simulation.option,
        riskTier: `${Math.round(simulation.financedShare * 100)}%`,
        status: "SIMULATED",
      },
      expect.objectContaining({ uid: "local-admin" }),
    );
  });

  it("creates a quote with case identity instead of request identity", async () => {
    const response = await createQuote(
      request("/api/admin/cases/case-1/quotes", {
        simulationId: simulation.id,
        clientIdentity: {
          fullName: "Forged Client",
          email: "forged@example.com",
        },
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(createQuoteMock).toHaveBeenCalledWith({
      simulation: expect.objectContaining({
        input: expect.objectContaining({
          uid: "client-1",
          caseId: "case-1",
        }),
      }),
      clientIdentity: {
        fullName: "Trusted Client",
        email: "trusted@example.com",
      },
    });
    expect(linkFinancialSimulation).toHaveBeenCalledWith(
      "case-1",
      expect.objectContaining({
        simulationId: simulation.id,
        quoteId: "quote-1",
        status: "QUOTED",
      }),
      expect.objectContaining({ uid: "local-admin" }),
    );
  });

  it("creates an internal report draft from the saved simulation", async () => {
    const response = await createReport(
      request("/api/admin/cases/case-1/reports", {
        simulationId: simulation.id,
        quoteId: "quote-1",
        region: "eu",
        xafAmount: 1,
      }),
      context,
    );

    expect(response.status).toBe(200);
    expect(createCaseReportDraft).toHaveBeenCalledWith(
      "case-1",
      {
        simulationId: simulation.id,
        quoteId: "quote-1",
        productCode: "prefinancement-canada-cad",
        region: simulation.region,
        xafAmount: simulation.xafEquivalent.targetAmount,
        option: simulation.option,
        riskTier: `${Math.round(simulation.financedShare * 100)}%`,
      },
      expect.objectContaining({ uid: "local-admin" }),
    );
  });

  it("rejects a simulation linked to another client", async () => {
    getSimulation.mockResolvedValue({
      ...simulation,
      input: {
        ...simulation.input,
        uid: "client-2",
      },
    });

    const response = await createQuote(
      request("/api/admin/cases/case-1/quotes", {
        simulationId: simulation.id,
      }),
      context,
    );

    expect(response.status).toBe(500);
    expect(createQuoteMock).not.toHaveBeenCalled();
    expect(linkFinancialSimulation).not.toHaveBeenCalled();
  });
});
