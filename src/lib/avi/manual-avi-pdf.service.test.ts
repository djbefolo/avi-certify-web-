import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseManualAviPayload } from "@/lib/validations/avi";
import {
  generateAndStoreManualAvi,
  generateManualAviPdf,
} from "./manual-avi-pdf.service";

const saveMock = vi.hoisted(() => vi.fn());
const downloadMock = vi.hoisted(() => vi.fn());
const transactionGetMock = vi.hoisted(() => vi.fn());
const transactionSetMock = vi.hoisted(() => vi.fn());
const attestationSetMock = vi.hoisted(() => vi.fn());
const versionSetMock = vi.hoisted(() => vi.fn());
const auditAddMock = vi.hoisted(() => vi.fn());
const pagePdfMock = vi.hoisted(() => vi.fn());
const setContentMock = vi.hoisted(() => vi.fn());
const closeMock = vi.hoisted(() => vi.fn());
const qrCodeMock = vi.hoisted(() => vi.fn());

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox"],
    executablePath: vi.fn(async () => "/mock/chromium"),
  },
}));

vi.mock("puppeteer-core", () => ({
  default: {
    defaultArgs: vi.fn(({ args }) => args),
    launch: vi.fn(async () => ({
      newPage: async () => ({
        setDefaultNavigationTimeout: vi.fn(),
        setDefaultTimeout: vi.fn(),
        setContent: setContentMock,
        emulateMediaType: vi.fn(),
        evaluate: vi.fn(),
        pdf: pagePdfMock,
      }),
      close: closeMock,
    })),
  },
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: qrCodeMock,
  },
  toDataURL: qrCodeMock,
}));

function versionCollection() {
  return {
    where: () => ({
      limit: () => ({
        get: async () => ({ empty: true, docs: [] }),
      }),
    }),
    doc: () => ({
      set: versionSetMock,
    }),
  };
}

function attestationsDoc(id: string) {
  return {
    id,
    set: attestationSetMock,
    get: async () => ({ exists: true, data: () => ({ pdfStoragePath: `avi-certificates/${id}.pdf` }) }),
    collection: () => versionCollection(),
  };
}

const dbMock = vi.hoisted(() => ({
  batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn() })),
  runTransaction: vi.fn(async (handler) =>
    handler({
      get: transactionGetMock,
      set: transactionSetMock,
    }),
  ),
  collection: vi.fn((name: string) => {
    if (name === "counters") {
      return {
        doc: () => ({
          collection: () => ({
            doc: (id: string) => ({ id, path: `counters/avi_sequences/items/${id}` }),
          }),
        }),
      };
    }

    if (name === "attestations") {
      return {
        doc: (id: string) => attestationsDoc(id),
      };
    }

    if (name === "audit_logs") {
      return {
        add: auditAddMock,
      };
    }

    return {
      doc: vi.fn(),
      add: vi.fn(),
    };
  }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => dbMock,
  getAdminStorage: () => ({
    bucket: () => ({
      file: (storagePath: string) => ({
        save: (buffer: Buffer, options: unknown) => saveMock(storagePath, buffer, options),
        download: downloadMock,
      }),
    }),
  }),
}));

function payload() {
  return parseManualAviPayload({
    studentFullName: "Awa Student",
    studentEmail: "awa@example.com",
    destinationCountry: "France",
    originCountry: "Cameroun",
    aviAmount: 7420,
    currency: "EUR",
    academicYear: "2026-2027",
    schoolName: "Universite test",
    issueDate: "2026-07-02",
    internalCaseReference: "CASE-1",
    notesForAdmin: "Do not print this note.",
  });
}

const actor = {
  uid: "admin-1",
  email: "admin@avicertify.fr",
  role: "admin" as const,
  authProvider: "dev-token" as const,
};

describe("official manual AVI generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionGetMock
      .mockResolvedValueOnce({ exists: true, data: () => ({ lastSequence: 10 }) })
      .mockResolvedValueOnce({ exists: false });
    pagePdfMock.mockResolvedValue(Buffer.from("%PDF official avi"));
    setContentMock.mockResolvedValue(undefined);
    closeMock.mockResolvedValue(undefined);
    qrCodeMock.mockResolvedValue("data:image/png;base64,QR");
    saveMock.mockResolvedValue(undefined);
    attestationSetMock.mockResolvedValue(undefined);
    versionSetMock.mockResolvedValue(undefined);
    auditAddMock.mockResolvedValue(undefined);
  });

  it("renders the official HTML template and converts it to PDF", async () => {
    const result = await generateManualAviPdf(payload());

    expect(result.identifiers.verificationCode).toBe("AVI-FR-26-CMR-01-00000011");
    expect(result.rendered.templateName).toBe("avi-certificate-europe-france.html");
    expect(result.identifiers.verificationUrl).toBe(
      "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00000011",
    );
    expect(qrCodeMock).toHaveBeenCalledWith(
      "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00000011",
      expect.objectContaining({ width: 260 }),
    );
    expect(setContentMock).toHaveBeenCalledWith(
      expect.stringContaining("AVI/FR/26/CMR/01/00000011"),
      expect.objectContaining({ waitUntil: "load" }),
    );
    expect(result.pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("stores PDF/HTML and writes verification metadata without admin notes", async () => {
    const result = await generateAndStoreManualAvi({
      payload: payload(),
      actor,
    });

    expect(result).toMatchObject({
      generated: true,
      reference: "AVI-FR-26-CMR-01-00000011",
      storagePath: "avi-certificates/AVI-FR-26-CMR-01-00000011.pdf",
      htmlStoragePath: "avi-certificates/AVI-FR-26-CMR-01-00000011.html",
      verificationUrl: "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00000011",
      pdfGenerationEngine: "chromium-html",
    });
    expect(saveMock).toHaveBeenCalledWith(
      "avi-certificates/AVI-FR-26-CMR-01-00000011.html",
      expect.any(Buffer),
      expect.objectContaining({
        metadata: expect.objectContaining({ contentType: "text/html; charset=utf-8" }),
      }),
    );
    expect(saveMock).toHaveBeenCalledWith(
      "avi-certificates/AVI-FR-26-CMR-01-00000011.pdf",
      expect.any(Buffer),
      expect.objectContaining({
        metadata: expect.objectContaining({ contentType: "application/pdf" }),
      }),
    );
    const firestorePayload = attestationSetMock.mock.calls[0][0];
    expect(firestorePayload).toMatchObject({
      reference: "AVI-FR-26-CMR-01-00000011",
      type: "avi",
      status: "ACTIVE",
      studentFullName: "Awa Student",
      source: "admin_manual",
      pdfStoragePath: "avi-certificates/AVI-FR-26-CMR-01-00000011.pdf",
    });
    expect(JSON.stringify(firestorePayload)).not.toContain("Do not print this note.");
    expect(versionSetMock).toHaveBeenCalled();
    expect(auditAddMock).toHaveBeenCalled();
  });
});
