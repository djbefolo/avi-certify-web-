import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createCommunicationLogMock = vi.fn();
const createEventMock = vi.fn();
const getCaseMock = vi.fn();
const linkFinancialSimulationMock = vi.fn();
const createSimulationMock = vi.fn();

vi.mock("@/lib/admin/admin-ops-store", () => ({
  getAdminOperationsStore: () => ({
    createCommunicationLog: createCommunicationLogMock,
    createEvent: createEventMock,
    getCase: getCaseMock,
    linkFinancialSimulation: linkFinancialSimulationMock,
  }),
}));

vi.mock("@/lib/fintech/fintech-store", () => ({
  getFintechStore: () => ({
    createSimulation: createSimulationMock,
  }),
}));

function request(headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/admin/fintech/reports", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      clientIdentity: {
        fullName: "Client AVI",
        email: "client@example.com",
      },
      simulationInput: {
        region: "canada",
        xafAmount: 8_000_000,
        contributionMonths: 3,
        uid: "uid_report_client",
        caseId: "case_report_client",
      },
    }),
  });
}

describe("admin fintech report generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCaseMock.mockResolvedValue({
      id: "case_report_client",
      uid: "uid_report_client",
      caseNumber: "AVI-REPORT-1",
      clientName: "Client AVI",
      clientEmail: "client@example.com",
    });
    linkFinancialSimulationMock.mockResolvedValue({ id: "finance-report-1" });
    createSimulationMock.mockImplementation(async (simulation) => simulation);
  });

  it("marks fintech reports as internal-only and records a non-sent communication trail", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ "x-admin-dev-token": "avi-local-admin" }));
    const body = (await response.json()) as {
      report: {
        id: string;
        deliveryStatus: string;
        emailStatus: string;
        deliveryNote: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.report.deliveryStatus).toBe("INTERNAL_ONLY");
    expect(body.report.emailStatus).toBe("NOT_SENT");
    expect(body.report.deliveryNote).toMatch(/non envoye/i);
    expect(createCommunicationLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_report_client",
        uid: "uid_report_client",
        type: "SYSTEM",
        template: "prefinancing-report-internal",
        recipient: "client@example.com",
        status: "NOT_SENT",
        provider: "system",
      }),
    );
    expect(createEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case_report_client",
        uid: "uid_report_client",
        eventType: "report_generated",
        eventPayload: expect.objectContaining({
          deliveryStatus: "INTERNAL_ONLY",
          emailStatus: "NOT_SENT",
          recipient: "client@example.com",
        }),
      }),
    );
    expect(linkFinancialSimulationMock).toHaveBeenCalledWith(
      "case_report_client",
      expect.objectContaining({
        reportId: expect.stringMatching(/^report_/),
        status: "REPORTED",
        reportStatus: "GENERATED",
      }),
      expect.objectContaining({ uid: "local-admin" }),
    );
    expect(createSimulationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          uid: "uid_report_client",
          caseId: "case_report_client",
        }),
      }),
    );
  });
});
