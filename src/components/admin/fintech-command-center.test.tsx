import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FintechCommandCenter } from "@/components/admin/fintech-command-center";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import {
  financialProducts,
  fxRates,
  pricingRules,
  riskSurchargeRules,
} from "@/lib/fintech/workbook-defaults";
import type { FinancingQuote, FinancialAuditEvent } from "@/types/fintech";

const service = new FinancingSimulationService();
const comparison = service.compare("canada", 8_000_000);
const simulation = comparison.optionA;
const quote: FinancingQuote = {
  id: "quote_test",
  createdAt: "2026-05-23T08:00:00.000Z",
  simulationId: simulation.id,
  clientIdentity: {
    fullName: "Client pilote AVI",
    email: "client@example.com",
  },
  lineItems: [],
  assumptions: {},
  simulationSnapshot: simulation,
  status: "pending_admin_validation",
};
const auditEvents: FinancialAuditEvent[] = [
  {
    id: "audit_test",
    type: "pricing_changed",
    action: "pricing_changed",
    createdAt: "2026-05-23T08:00:00.000Z",
    environment: "test",
    actor: "local-admin",
    actorId: "local-admin",
    actorLabel: "local-admin@avicertify.local",
    actorRole: "admin",
    targetCollection: "pricing_rules",
    resourceType: "pricing_rules",
    metadata: { region: "canada" },
  },
];

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Unauthorized",
    json: async () => body,
  } as Response;
}

function mockAdminFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/products")) {
      return jsonResponse({ products: financialProducts });
    }
    if (url.includes("/fx") && method === "PATCH") {
      return jsonResponse({ fxRate: fxRates[1] });
    }
    if (url.includes("/fx")) {
      return jsonResponse({ fxRates });
    }
    if (url.includes("/pricing-rules") && method === "PATCH") {
      return jsonResponse({ pricingRule: pricingRules[0] });
    }
    if (url.includes("/pricing-rules")) {
      return jsonResponse({ pricingRules });
    }
    if (url.includes("/risk-rules") && method === "PATCH") {
      return jsonResponse({ riskRule: riskSurchargeRules[0] });
    }
    if (url.includes("/risk-rules")) {
      return jsonResponse({ riskRules: riskSurchargeRules });
    }
    if (url.includes("/simulations") && method === "POST") {
      return jsonResponse({ simulation });
    }
    if (url.includes("/simulations")) {
      return jsonResponse({ simulations: [simulation] });
    }
    if (url.includes("/quotes") && method === "POST") {
      return jsonResponse({ quote });
    }
    if (url.includes("/quotes")) {
      return jsonResponse({ quotes: [quote] });
    }
    if (url.includes("/audit-events")) {
      return jsonResponse({ auditEvents });
    }
    if (url.includes("/comparison")) {
      return jsonResponse({ comparison });
    }
    if (url.includes("/sensitivity")) {
      return jsonResponse({ sensitivity: service.sensitivity("canada") });
    }
    if (url.includes("/reports")) {
      return jsonResponse({
        report: {
          id: "report_test",
          createdAt: "2026-05-23T08:00:00.000Z",
          clientIdentity: {},
          targetCountryOrZone: "Canada",
          targetAmount: simulation.targetAmount,
          targetCurrency: simulation.targetCurrency,
          selectedOption: simulation.option,
          feesBreakdown: {
            financingFee: simulation.financingFee,
            transferFee: simulation.transferFee,
            serviceFee: simulation.serviceFee,
            netFees: simulation.netFees,
          },
          repaymentSchedule: simulation.amortizationSchedule,
          totalClientEffort: simulation.totalClientEffort,
          complianceNotes: ["Simulation indicative."],
          adminValidationStatus: "pending_admin_validation",
        },
      });
    }

    return jsonResponse({ error: "Not found" }, false, 404);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("FintechCommandCenter", () => {
  beforeEach(() => {
    window.sessionStorage.setItem("avi_admin_api_token", "avi-local-admin");
  });

  it("renders the premium admin overview from protected admin API data", async () => {
    mockAdminFetch();

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Executive overview")).toBeInTheDocument();
    expect(screen.getAllByText("Financed exposure").length).toBeGreaterThan(0);
    expect(screen.getByText("Recent activity")).toBeInTheDocument();
  });

  it("displays the audited Canada comparison output and saves a simulation through the API", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Executive overview");
    await user.click(screen.getAllByRole("button", { name: "Simulations" })[0]);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();
    expect(screen.getByText(/Canada delta is recalculated/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save simulation" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/simulations",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("updates FX, pricing, and risk panels only through protected admin APIs", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Executive overview");

    await user.click(screen.getAllByRole("button", { name: "FX Rates" })[0]);
    await user.click((await screen.findAllByRole("button", { name: "Update" }))[0]);

    await user.click(screen.getAllByRole("button", { name: "Pricing Rules" })[0]);
    await user.click((await screen.findAllByRole("button", { name: "Update pricing" }))[0]);

    await user.click(screen.getAllByRole("button", { name: "Risk Rules" })[0]);
    await user.click((await screen.findAllByRole("button", { name: "Update risk tiers" }))[0]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/fintech/fx",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/fintech/pricing-rules",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/fintech/risk-rules",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("renders a print-ready report layout after generation", async () => {
    mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Executive overview");
    await user.click(screen.getAllByRole("button", { name: "Simulations" })[0]);
    await user.click(await screen.findByRole("button", { name: "Generate report" }));

    expect(await screen.findByText("Client prefinancing report")).toBeInTheDocument();
    expect(screen.getByText("Internal reference: report_test")).toBeInTheDocument();
    expect(screen.getByText("Repayment schedule")).toBeInTheDocument();
  });

  it("renders an unauthorized state when the admin API rejects access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "Admin authentication required." }, false, 401)),
    );

    render(<FintechCommandCenter />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Admin API unavailable or unauthorized.")).toBeInTheDocument();
  });
});
