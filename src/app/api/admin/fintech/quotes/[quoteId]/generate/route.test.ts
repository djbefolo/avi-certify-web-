import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";

class MockQuotePdfError extends Error {
  constructor(
    public readonly code:
      | "QUOTE_DATA_INVALID"
      | "QUOTE_PDF_BUILD_FAILED"
      | "QUOTE_STORAGE_UPLOAD_FAILED",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

const storeQuotePdfMock = vi.fn();
const createCommunicationLogMock = vi.fn();
const createEventMock = vi.fn();

const service = new FinancingSimulationService();
const simulation = service.simulate({
  region: "canada",
  xafAmount: 8_000_000,
  contributionMonths: 3,
  clientName: "Client AVI",
  clientEmail: "client@example.com",
  uid: "uid_pdf_client",
  caseId: "case_pdf_client",
});

let quoteState: FinancingQuote | null = null;

vi.mock("@/lib/fintech/quote-pdf.service", () => ({
  QuotePdfError: MockQuotePdfError,
  storeQuotePdf: storeQuotePdfMock,
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    createCommunicationLog: createCommunicationLogMock,
    createEvent: createEventMock,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    getQuote: vi.fn(async (id: string) => (quoteState?.id === id ? quoteState : null)),
    updateQuote: vi.fn(async (id: string, patch: Partial<FinancingQuote>) => {
      if (!quoteState || quoteState.id !== id) {
        throw new Error("Quote not found.");
      }

      quoteState = { ...quoteState, ...patch };
      return quoteState;
    }),
  }),
}));

function makeQuote(patch: Partial<FinancingQuote> = {}): FinancingQuote {
  return {
    id: "quote_pdf_test",
    createdAt: "2026-06-01T08:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {
      fullName: "Client AVI",
      email: "client@example.com",
    },
    lineItems: [],
    assumptions: {},
    simulationSnapshot: simulation,
    status: "DRAFT",
    uid: "uid_pdf_client",
    caseId: "case_pdf_client",
    deliveryStatus: "PDF_MISSING",
    ...patch,
  };
}

function request(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/admin/fintech/quotes/quote_pdf_test/generate", {
    method: "POST",
    headers,
  });
}

const params = { params: Promise.resolve({ quoteId: "quote_pdf_test" }) };
const adminHeaders = { "x-admin-dev-token": "avi-local-admin" };

describe("quote PDF generation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quoteState = makeQuote();
    storeQuotePdfMock.mockResolvedValue({
      storagePath: "admin/quotes/uid_pdf_client/quote_pdf_test.pdf",
      size: 2048,
      bucket: "avi-certify-platform.appspot.com",
    });
  });

  it("generates, uploads, persists metadata, and writes log/timeline evidence", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as {
      quote: FinancingQuote;
      file: { storagePath: string; size: number; bucket: string };
    };

    expect(response.status).toBe(200);
    expect(storeQuotePdfMock).toHaveBeenCalledWith(expect.objectContaining({ id: "quote_pdf_test" }));
    expect(body.quote.status).toBe("GENERATED");
    expect(body.quote.pdfStoragePath).toBe("admin/quotes/uid_pdf_client/quote_pdf_test.pdf");
    expect(body.quote.generatedAt).toEqual(expect.any(String));
    expect(body.quote.deliveryStatus).toBe("NOT_SENT");
    expect(body.file).toMatchObject({
      storagePath: "admin/quotes/uid_pdf_client/quote_pdf_test.pdf",
      size: 2048,
    });
    expect(createCommunicationLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_pdf_client",
        type: "SYSTEM",
        template: "quote-pdf-generated",
        status: "NOT_SENT",
        provider: "system",
      }),
    );
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_pdf_client",
        eventType: "quote_pdf_generated",
        eventPayload: expect.objectContaining({
          quoteId: "quote_pdf_test",
          deliveryStatus: "NOT_SENT",
        }),
      }),
    );
  });

  it("returns structured upload failures and marks the quote GENERATING_FAILED", async () => {
    const { POST } = await import("./route");
    storeQuotePdfMock.mockRejectedValueOnce(
      new MockQuotePdfError("QUOTE_STORAGE_UPLOAD_FAILED", "Quote PDF upload failed."),
    );

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      code: "QUOTE_STORAGE_UPLOAD_FAILED",
      error: "Quote PDF upload failed.",
    });
    expect(quoteState?.deliveryStatus).toBe("GENERATING_FAILED");
    expect(quoteState?.deliveryMessage).toBe("QUOTE_STORAGE_UPLOAD_FAILED");
    expect(createCommunicationLogMock).not.toHaveBeenCalled();
  });

  it("returns structured validation failures instead of generic 500", async () => {
    const { POST } = await import("./route");
    storeQuotePdfMock.mockRejectedValueOnce(
      new MockQuotePdfError("QUOTE_DATA_INVALID", "Quote simulation snapshot is required."),
    );

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: "QUOTE_DATA_INVALID",
      error: "Quote simulation snapshot is required.",
    });
  });

  it("returns QUOTE_NOT_FOUND for missing quote records", async () => {
    const { POST } = await import("./route");
    quoteState = null;

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(404);
    expect(body.code).toBe("QUOTE_NOT_FOUND");
  });
});
