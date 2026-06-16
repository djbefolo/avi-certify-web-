import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteShell } from "@/components/layout/site-shell";
import { FintechCommandCenter } from "@/components/admin/fintech-command-center";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import {
  financialProducts,
  fxRates,
  pricingRules,
  riskSurchargeRules,
} from "@/lib/fintech/workbook-defaults";
import type { FinancingQuote, FinancialAuditEvent } from "@/types/fintech";
import { usePathname } from "next/navigation";

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
  status: "GENERATED",
  pdfStoragePath: "admin/quotes/client-1/quote_test.pdf",
  deliveryStatus: "NOT_SENT",
  deliveryMessage: "PDF_GENERATED_EMAIL_NOT_SENT",
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
    if (url.includes("/quotes/quote_test") && method === "PATCH") {
      return jsonResponse({
        quote: {
          ...quote,
          title: "Devis commercial personnalisé",
          validUntil: "2026-07-15",
          paymentDeadline: "2026-06-30",
        },
      });
    }
    if (url.includes("/quotes/quote_test/generate") && method === "POST") {
      return jsonResponse({ quote });
    }
    if (url.includes("/quotes/quote_test/send") && method === "POST") {
      return jsonResponse({
        quote: {
          ...quote,
          status: "SENT",
          deliveryStatus: "SENT",
          lastDeliveryAttemptAt: "2026-05-23T08:05:00.000Z",
        },
        email: { sent: true, status: "SENT", messageId: "resend_msg_test" },
      });
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
          deliveryStatus: "INTERNAL_ONLY",
          emailStatus: "NOT_SENT",
          deliveryNote: "Rapport interne non envoyé au client.",
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

  it("renders the completed command-center navigation and first-screen cockpit", async () => {
    mockAdminFetch();

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();
    for (const label of [
      "Vue d'ensemble",
      "Simulateur",
      "Comparaison",
      "Sensibilité",
      "Simulations",
      "Devis",
      "Rapports",
      "FX",
      "Pricing",
      "Risque",
      "Audit",
    ]) {
      expect(screen.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Fallback dev state")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Dev admin API token")).not.toBeInTheDocument();
  });

  it("renders every command-center section as a distinct working panel", async () => {
    mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();

    const sections = [
      ["Vue d'ensemble", "Vue d'ensemble"],
      ["Simulateur", "Simulation cockpit"],
      ["Comparaison", "Option A vs Option B comparison"],
      ["Sensibilité", "Sensibilité"],
      ["Simulations", "Historique des simulations"],
      ["Devis", "Gestion des devis"],
      ["Rapports", "Rapports de préfinancement"],
      ["FX", "FX rates"],
      ["Pricing", "Pricing rules"],
      ["Risque", "Risk surcharge tiers"],
      ["Audit", "Financial audit log"],
    ] as const;

    for (const [tab, panel] of sections) {
      await user.click(screen.getAllByRole("button", { name: tab })[0]);
      expect((await screen.findAllByText(panel)).length).toBeGreaterThan(0);
    }
  });

  it("displays the audited Canada comparison output and saves a simulation through the API", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();
    expect(screen.getByText("Source: Engine computed via protected admin APIs")).toBeInTheDocument();
    expect(screen.getByText(/Canada delta is recalculated/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Enregistrer simulation" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/simulations",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("loads comparison and sensitivity from protected engine APIs", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Simulation cockpit");
    const generateButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("simulation"));

    expect(generateButton).toBeDefined();
    await user.click(generateButton as HTMLButtonElement);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/comparison?region=canada&xafAmount=8000000",
        expect.objectContaining({ credentials: "include" }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/sensitivity?region=canada",
        expect.objectContaining({ credentials: "include" }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Comparaison" })[0]);
    expect(await screen.findByText("Source: Engine computed")).toBeInTheDocument();
    expect(screen.getAllByText(/407,29 CAD/).length).toBeGreaterThan(0);
  });

  it("updates FX, pricing, and risk panels only through protected admin APIs", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Simulation cockpit");

    await user.click(screen.getAllByRole("button", { name: "FX" })[0]);
    await user.click((await screen.findAllByRole("button", { name: "Update" }))[0]);

    await user.click(screen.getAllByRole("button", { name: "Pricing" })[0]);
    await user.click((await screen.findAllByRole("button", { name: "Update pricing" }))[0]);

    await user.click(screen.getAllByRole("button", { name: "Risque" })[0]);
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

  it("exposes real quote PDF actions through protected admin APIs", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Devis" })[0]);
    expect((await screen.findAllByText("GENERATED")).length).toBeGreaterThan(0);
    await user.click(await screen.findByRole("button", { name: "Générer PDF" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/quotes/quote_test/generate",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await user.click(screen.getAllByRole("button", { name: "Voir PDF" })[0]);
    expect(openMock).toHaveBeenCalledWith(
      "/api/admin/fintech/quotes/quote_test/preview",
      "_blank",
      "noopener,noreferrer",
    );

    await user.click(screen.getAllByRole("button", { name: "Envoyer" })[0]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/quotes/quote_test/send",
        expect.objectContaining({ method: "POST", credentials: "include" }),
      );
    });
    expect(await screen.findByText("Devis envoyé: quote_test")).toBeInTheDocument();
  });

  it("opens the quote workspace after quote creation and saves commercial fields", async () => {
    const fetchMock = mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    expect(await screen.findByText("Simulation cockpit")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Créer devis" }));

    expect(await screen.findByText("Devis créé")).toBeInTheDocument();
    expect(await screen.findByText("Devis commercial - quote_test")).toBeInTheDocument();
    expect(screen.getByText("Identité client")).toBeInTheDocument();
    expect(screen.getByText("Simulation source")).toBeInTheDocument();

    const titleInput = screen.getByLabelText("Titre du devis");
    await user.clear(titleInput);
    await user.type(titleInput, "Devis commercial personnalisé");
    await user.click(screen.getByRole("button", { name: "Enregistrer les conditions" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/fintech/quotes/quote_test",
        expect.objectContaining({
          method: "PATCH",
          credentials: "include",
          body: expect.stringContaining("Devis commercial personnalisé"),
        }),
      );
    });
  });

  it("shows deterministic quote PDF generation states", async () => {
    const missingQuote: FinancingQuote = {
      ...quote,
      id: "quote_missing",
      status: "DRAFT",
      pdfStoragePath: null,
      deliveryStatus: "PDF_MISSING",
    };
    const failedQuote: FinancingQuote = {
      ...quote,
      id: "quote_failed",
      status: "DRAFT",
      pdfStoragePath: null,
      deliveryStatus: "GENERATING_FAILED",
      deliveryMessage: "QUOTE_STORAGE_UPLOAD_FAILED",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/products")) return jsonResponse({ products: financialProducts });
        if (url.includes("/fx")) return jsonResponse({ fxRates });
        if (url.includes("/pricing-rules")) return jsonResponse({ pricingRules });
        if (url.includes("/risk-rules")) return jsonResponse({ riskRules: riskSurchargeRules });
        if (url.includes("/simulations")) return jsonResponse({ simulations: [simulation] });
        if (url.includes("/quotes")) return jsonResponse({ quotes: [missingQuote, failedQuote] });
        if (url.includes("/audit-events")) return jsonResponse({ auditEvents });
        if (url.includes("/comparison")) return jsonResponse({ comparison });
        if (url.includes("/sensitivity")) return jsonResponse({ sensitivity: service.sensitivity("canada") });

        return jsonResponse({ error: "Not found" }, false, 404);
      }),
    );
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Simulation cockpit");
    await user.click(screen.getAllByRole("button", { name: "Devis" })[0]);

    expect((await screen.findAllByText("PDF_MISSING")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF absent: cliquez sur Générer PDF").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GENERATING_FAILED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Génération PDF échouée: vérifier le code d'erreur").length).toBeGreaterThan(0);
  });

  it("renders a print-ready report layout after generation", async () => {
    mockAdminFetch();
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Simulation cockpit");
    await user.click(await screen.findByRole("button", { name: "Générer rapport" }));

    expect(await screen.findByText("Client prefinancing report")).toBeInTheDocument();
    expect(screen.getByText("Internal reference: report_test")).toBeInTheDocument();
    expect(screen.getByText("INTERNAL_ONLY")).toBeInTheDocument();
    expect(screen.getByText("Rapport interne non envoyé au client.")).toBeInTheDocument();
    expect(screen.getByText("Repayment schedule")).toBeInTheDocument();
  });

  it("shows professional empty states instead of fallback development wording", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/products")) return jsonResponse({ products: financialProducts });
        if (url.includes("/fx")) return jsonResponse({ fxRates });
        if (url.includes("/pricing-rules")) return jsonResponse({ pricingRules });
        if (url.includes("/risk-rules")) return jsonResponse({ riskRules: riskSurchargeRules });
        if (url.includes("/simulations")) return jsonResponse({ simulations: [] });
        if (url.includes("/quotes")) return jsonResponse({ quotes: [] });
        if (url.includes("/audit-events")) return jsonResponse({ auditEvents: [] });
        if (url.includes("/comparison")) return jsonResponse({ comparison });
        if (url.includes("/sensitivity")) {
          return jsonResponse({ sensitivity: service.sensitivity("canada") });
        }

        return jsonResponse({ error: "Not found" }, false, 404);
      }),
    );
    const user = userEvent.setup();

    render(<FintechCommandCenter />);

    await screen.findByText("Simulation cockpit");
    await user.click(screen.getAllByRole("button", { name: "Simulations" })[0]);
    expect(await screen.findByText("Aucune simulation enregistrée")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Devis" })[0]);
    expect(await screen.findByText("Aucun devis généré")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Audit" })[0]);
    expect(await screen.findByText("Aucune activité récente")).toBeInTheDocument();
    expect(screen.queryByText("Fallback dev state")).not.toBeInTheDocument();
  });

  it("renders an unauthorized state when the admin API rejects access", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "Admin authentication required." }, false, 401)),
    );

    render(<FintechCommandCenter />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Erreur opérationnelle admin")).toBeInTheDocument();
  });

  it("keeps public floating CTA out of admin routes through the private shell", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");

    render(
      <SiteShell>
        <div>Admin protected content</div>
      </SiteShell>,
    );

    expect(screen.getByText("Admin protected content")).toBeInTheDocument();
    expect(screen.queryByText("Mon espace")).not.toBeInTheDocument();
  });
});
