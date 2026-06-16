import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientQuotesList } from "@/components/dashboard/client-quotes-list";
import type { ClientQuoteView } from "@/types/fintech";

const getIdTokenMock = vi.fn(async () => "client-token");

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      getIdToken: getIdTokenMock,
    },
  }),
}));

const quote: ClientQuoteView = {
  id: "quote_client_safe",
  createdAt: "2026-06-02T08:00:00.000Z",
  lineItems: [],
  status: "SENT",
  title: "Devis mobilité Canada",
  validUntil: "2026-07-15",
  paymentDeadline: null,
  commercialNote: null,
  termsAndConditions: null,
  requiredDocumentsBeforeApproval: [],
  disclaimer: null,
  recommendationSummary: null,
  generatedAt: "2026-06-02T09:00:00.000Z",
  sentAt: "2026-06-03T08:00:00.000Z",
  expiresAt: null,
  pdfAvailable: true,
  simulation: {
    region: "canada",
    targetCurrency: "CAD",
    option: "option_a_3m",
    targetAmount: 19_550,
    studentContribution: 4_887,
    financedAmount: 14_663,
    cashDueAtSignature: 6_943,
    monthlyRepayment: 1_222,
    netFees: 2_055,
    totalClientEffort: 21_605,
  },
};

describe("ClientQuotesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/download")) {
          return {
            ok: true,
            blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ quotes: [quote] }),
        } as Response;
      }),
    );
    vi.stubGlobal("open", vi.fn());
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:quote"),
    });
  });

  it("renders client-safe sent/generated quote fields and hides internal admin notes", async () => {
    render(<ClientQuotesList />);

    expect(await screen.findByText("Devis mobilité Canada")).toBeInTheDocument();
    expect(screen.getByText(/Canada - option_a_3m - Envoyé/)).toBeInTheDocument();
    expect(screen.getByText(/Validité: 15\/07\/2026/)).toBeInTheDocument();
    expect(screen.queryByText("Do not expose this admin note")).not.toBeInTheDocument();
  });

  it("downloads a generated quote through the protected client route", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);

    render(<ClientQuotesList />);
    await screen.findByText("Devis mobilité Canada");
    await user.click(screen.getByRole("button", { name: "Télécharger" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/client/quotes/quote_client_safe/download",
        expect.objectContaining({
          headers: { authorization: "Bearer client-token" },
        }),
      );
    });
  });
});
