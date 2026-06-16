import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";

const storeQuotePdfMock = vi.fn();
const sendQuoteReadyEmailMock = vi.fn();
const createCommunicationLogMock = vi.fn();
const createEventMock = vi.fn();
const linkFinancialSimulationMock = vi.fn();

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

const service = new FinancingSimulationService();
const simulation = service.simulate({
  region: "canada",
  xafAmount: 8_000_000,
  contributionMonths: 3,
  clientName: "Client AVI",
  clientEmail: "client@example.com",
  uid: "uid_quote_client",
  caseId: "case_quote_client",
});

let quoteState: FinancingQuote | null = null;

vi.mock("@/lib/fintech/quote-pdf.service", () => ({
  QuotePdfError: MockQuotePdfError,
  storeQuotePdf: storeQuotePdfMock,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendQuoteReadyEmail: sendQuoteReadyEmailMock,
}));

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    createCommunicationLog: createCommunicationLogMock,
    createEvent: createEventMock,
    linkFinancialSimulation: linkFinancialSimulationMock,
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
    id: "quote_send_test",
    createdAt: "2026-05-31T10:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {
      fullName: "Client AVI",
      email: "client@example.com",
    },
    lineItems: [],
    assumptions: {},
    simulationSnapshot: simulation,
    status: "DRAFT",
    uid: "uid_quote_client",
    caseId: "case_quote_client",
    ...patch,
  };
}

function request(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/admin/fintech/quotes/quote_send_test/send", {
    method: "POST",
    headers,
  });
}

const params = { params: Promise.resolve({ quoteId: "quote_send_test" }) };
const adminHeaders = { "x-admin-dev-token": "avi-local-admin" };

describe("quote send admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quoteState = makeQuote();
    storeQuotePdfMock.mockResolvedValue({
      storagePath: "admin/quotes/uid_quote_client/quote_send_test.pdf",
      size: 1024,
    });
    sendQuoteReadyEmailMock.mockResolvedValue({
      sent: true,
      messageId: "resend_msg_123",
      status: "SENT",
      provider: "resend",
    });
    linkFinancialSimulationMock.mockResolvedValue({ id: "finance-send-1" });
  });

  it("rejects anonymous requests with a structured auth status, not a 500", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(), params);
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(response.status).not.toBe(500);
    expect(body.error).toMatch(/Admin authentication required/i);
    expect(sendQuoteReadyEmailMock).not.toHaveBeenCalled();
  });

  it("generates the quote PDF when missing, sends email, and marks the quote SENT", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as {
      quote: FinancingQuote;
      email: { sent: boolean; status: string; messageId: string | null };
    };

    expect(response.status).toBe(200);
    expect(storeQuotePdfMock).toHaveBeenCalledWith(expect.objectContaining({ id: "quote_send_test" }));
    expect(sendQuoteReadyEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "client@example.com",
        quoteId: "quote_send_test",
      }),
    );
    expect(body.quote.status).toBe("SENT");
    expect(body.quote.pdfStoragePath).toBe("admin/quotes/uid_quote_client/quote_send_test.pdf");
    expect(body.quote.sentAt).toEqual(expect.any(String));
    expect(body.quote.deliveryStatus).toBe("SENT");
    expect(body.quote.lastDeliveryAttemptAt).toEqual(expect.any(String));
    expect(body.quote.lastEmailMessageId).toBe("resend_msg_123");
    expect(body.email).toMatchObject({
      sent: true,
      status: "SENT",
      messageId: "resend_msg_123",
    });
    expect(createCommunicationLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_quote_client",
        status: "SENT",
        provider: "resend",
        messageId: "resend_msg_123",
      }),
    );
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_quote_client",
        eventType: "quote_sent",
        eventPayload: expect.objectContaining({ deliveryStatus: "SENT" }),
      }),
    );
    expect(linkFinancialSimulationMock).toHaveBeenCalledWith(
      "case_quote_client",
      expect.objectContaining({
        quoteId: "quote_send_test",
        status: "SENT",
      }),
      expect.objectContaining({ uid: "local-admin" }),
    );
  });

  it("does not claim success when Resend fails", async () => {
    const { POST } = await import("./route");
    sendQuoteReadyEmailMock.mockResolvedValueOnce({
      sent: false,
      messageId: null,
      status: "SEND_FAILED",
      provider: "resend",
    });

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as {
      quote: FinancingQuote;
      email: { sent: boolean; status: string };
    };

    expect(response.status).toBe(200);
    expect(body.quote.status).toBe("GENERATED");
    expect(body.quote.deliveryStatus).toBe("SEND_FAILED");
    expect(body.email).toMatchObject({ sent: false, status: "SEND_FAILED" });
    expect(createCommunicationLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        provider: "resend",
      }),
    );
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventPayload: expect.objectContaining({ deliveryStatus: "SEND_FAILED" }),
      }),
    );
  });

  it("records recipient-missing quote send attempts without claiming delivery", async () => {
    const { POST } = await import("./route");
    quoteState = makeQuote({ clientIdentity: { fullName: "Client AVI" } });
    sendQuoteReadyEmailMock.mockResolvedValueOnce({
      sent: false,
      messageId: null,
      status: "RECIPIENT_MISSING",
      provider: "resend",
    });

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as {
      quote: FinancingQuote;
      email: { sent: boolean; status: string };
    };

    expect(response.status).toBe(200);
    expect(body.quote.status).toBe("GENERATED");
    expect(body.quote.deliveryStatus).toBe("RECIPIENT_MISSING");
    expect(body.email).toMatchObject({ sent: false, status: "RECIPIENT_MISSING" });
    expect(createCommunicationLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: null,
        status: "NOT_SENT",
      }),
    );
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventPayload: expect.objectContaining({
          deliveryStatus: "RECIPIENT_MISSING",
          recipient: null,
        }),
      }),
    );
  });

  it("returns a clear action-required status when PDF generation fails", async () => {
    const { POST } = await import("./route");
    storeQuotePdfMock.mockRejectedValueOnce(new Error("storage unavailable"));

    const response = await POST(request(adminHeaders), params);
    const body = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      code: "QUOTE_PDF_BUILD_FAILED",
    });
    expect(body.error).toMatch(/PDF du devis/i);
    expect(quoteState?.deliveryStatus).toBe("GENERATING_FAILED");
    expect(sendQuoteReadyEmailMock).not.toHaveBeenCalled();
  });
});
