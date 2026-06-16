import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";
import { GET } from "./route";

const verifyIdToken = vi.hoisted(() => vi.fn());
const getQuote = vi.hoisted(() => vi.fn());
const pdfMocks = vi.hoisted(() => {
  class TestQuotePdfError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    getStoredQuotePdf: vi.fn(),
    QuotePdfError: TestQuotePdfError,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifyIdToken,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    getQuote,
  }),
}));

vi.mock("@/lib/fintech/quote-pdf.service", () => pdfMocks);

function quote(
  uid: string,
  status: FinancingQuote["status"] = "GENERATED",
): FinancingQuote {
  const simulation = new FinancingSimulationService().simulate({
    region: "eu",
    xafAmount: 8_000_000,
    contributionMonths: 3,
    uid,
    caseId: `case-${uid}`,
  });

  return {
    id: "quote-1",
    createdAt: "2026-06-15T10:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {},
    lineItems: [],
    assumptions: {},
    simulationSnapshot: simulation,
    status,
    uid,
    caseId: `case-${uid}`,
    pdfStoragePath: `admin/quotes/${uid}/quote-1.pdf`,
  };
}

function request(authenticated = true) {
  return new NextRequest(
    "http://localhost/api/client/quotes/quote-1/download",
    {
      headers: authenticated
        ? { authorization: "Bearer client-token" }
        : undefined,
    },
  );
}

const context = { params: Promise.resolve({ quoteId: "quote-1" }) };

describe("client quote PDF download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: "client-1" });
    getQuote.mockResolvedValue(quote("client-1"));
    pdfMocks.getStoredQuotePdf.mockResolvedValue({
      file: {
        download: vi.fn().mockResolvedValue([Buffer.from("%PDF-test")]),
      },
    });
  });

  it("streams an owned generated quote as an attachment", async () => {
    const response = await GET(request(), context);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe(
      "%PDF-test",
    );
  });

  it("does not reveal a quote owned by another client", async () => {
    getQuote.mockResolvedValue(quote("client-2"));

    const response = await GET(request(), context);

    expect(response.status).toBe(404);
    expect(pdfMocks.getStoredQuotePdf).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    const response = await GET(request(false), context);

    expect(response.status).toBe(401);
    expect(getQuote).not.toHaveBeenCalled();
  });

  it("rejects a draft quote even for its owner", async () => {
    getQuote.mockResolvedValue(quote("client-1", "DRAFT"));

    const response = await GET(request(), context);

    expect(response.status).toBe(409);
    expect(pdfMocks.getStoredQuotePdf).not.toHaveBeenCalled();
  });

  it("maps invalid secure-storage metadata to a conflict", async () => {
    pdfMocks.getStoredQuotePdf.mockRejectedValue(
      new pdfMocks.QuotePdfError(
        "QUOTE_STORAGE_METADATA_INVALID",
        "Invalid metadata",
      ),
    );

    const response = await GET(request(), context);

    expect(response.status).toBe(409);
  });
});
