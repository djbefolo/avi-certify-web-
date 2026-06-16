import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinancingSimulationService } from "@/lib/fintech/financing-simulation.service";
import type { FinancingQuote } from "@/types/fintech";
import {
  generateQuotePdfBuffer,
  getStoredQuotePdf,
  quotePdfStoragePath,
  QuotePdfError,
} from "./quote-pdf.service";

const getMetadata = vi.hoisted(() => vi.fn());
const file = vi.hoisted(() => ({
  getMetadata,
  download: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorage: () => ({
    bucket: () => ({
      file: () => file,
    }),
  }),
}));

function quote(overrides: Partial<FinancingQuote> = {}): FinancingQuote {
  const simulation = new FinancingSimulationService().simulate({
    region: "canada",
    xafAmount: 8_000_000,
    contributionMonths: 3,
    uid: "client-1",
    caseId: "case-1",
  });

  return {
    id: "quote-1",
    createdAt: "2026-06-15T10:00:00.000Z",
    simulationId: simulation.id,
    clientIdentity: {
      fullName: "Client AVI",
      email: "client@example.com",
    },
    lineItems: [],
    assumptions: {},
    simulationSnapshot: simulation,
    status: "GENERATED",
    uid: "client-1",
    caseId: "case-1",
    pdfStoragePath: "admin/quotes/client-1/quote-1.pdf",
    ...overrides,
  };
}

describe("quote PDF security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("FIREBASE_STORAGE_BUCKET", "test-bucket");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a real PDF from the audited simulation snapshot", async () => {
    const buffer = await generateQuotePdfBuffer(quote());

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("uses an owner-scoped storage path and rejects unsafe identifiers", () => {
    expect(quotePdfStoragePath(quote())).toBe(
      "admin/quotes/client-1/quote-1.pdf",
    );
    expect(() => quotePdfStoragePath(quote({ id: "../quote-1" }))).toThrow(
      QuotePdfError,
    );
  });

  it("requires matching content type, size, quote id, and owner metadata", async () => {
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: {
          quoteId: "quote-1",
          uid: "client-1",
        },
      },
    ]);

    await expect(getStoredQuotePdf(quote())).resolves.toMatchObject({
      file,
      size: 1024,
      bucketName: "test-bucket",
      storagePath: "admin/quotes/client-1/quote-1.pdf",
    });
  });

  it("rejects missing ownership metadata in Storage", async () => {
    getMetadata.mockResolvedValue([
      {
        contentType: "application/pdf",
        size: "1024",
        metadata: {},
      },
    ]);

    await expect(getStoredQuotePdf(quote())).rejects.toMatchObject({
      code: "QUOTE_STORAGE_METADATA_INVALID",
    });
  });

  it("rejects a stored path that differs from the owner-scoped path", async () => {
    await expect(
      getStoredQuotePdf(
        quote({ pdfStoragePath: "admin/quotes/client-2/quote-1.pdf" }),
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_STORAGE_METADATA_INVALID",
    });
    expect(getMetadata).not.toHaveBeenCalled();
  });
});
