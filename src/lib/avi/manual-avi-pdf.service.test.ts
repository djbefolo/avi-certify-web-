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
    studentCivility: "Madame",
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

const franceLegalFooterText =
  "AVI CERTIFY est une société de courtage financier régie par le Code Monétaire et Financier Français, immatriculée au registre des intermédiaires en opérations de banque et service de paiement sous le N°25005516 (www.orias.fr) et ayant souscrit à une assurance Responsabilité Civile Professionnelle (police N°BZIOB0001804) est une garantie financière (police N°BZIOB001804) auprès de l’assureur Lloyd’s Insurance Company S.A, représentée par +Simple (www.plusimple.fr), en application des articles L.519-3-4 et R.519-16-17 du Code Monétaire et Financier. AVI CERTIFY est partenaire de BNP PARIBAS, établissement de crédit de droit français agrée et supervisé conformément à la réglementation bancaire applicable, SA au capital de 2 233 569 514 euros, immatriculée au RCS de Paris sous le numéro 662 042 449, et dont le siège social est situé : 16 Boulevard des Italiens, 75009 Paris. AVI CERTIFY exerce ses activités sous le contrôle de l’ACPR, 4 Place de Budapest, 75436 Paris Cedex 09.";

function latestRenderedHtml() {
  const call = setContentMock.mock.calls[setContentMock.mock.calls.length - 1];
  return String(call?.[0] ?? "");
}

function textContent(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

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

  it("keeps the France legal footer exact and fixed", async () => {
    await generateManualAviPdf(payload());

    const html = latestRenderedHtml();
    expect(html).toContain('<h1 class="france-title">ATTESTATION DE VIREMENT IRREVOCABLE</h1>');
    expect(html).toContain(".avi-body-france { font-family:Arial, sans-serif; font-size:11pt;");
    expect(html).toContain(".legal-footer-france {");
    expect(html).toContain("legal-footer-france");
    expect(html).toContain("font-family: Arial, sans-serif;");
    expect(html).toContain("font-size: 6pt;");
    expect(html).toContain("color: #000;");
    expect(html).toContain("color: #0000ee;");
    expect(html).toContain("text-decoration: underline;");
    expect(textContent(html)).toContain(franceLegalFooterText);

    [
      "AVI CERTIFY",
      "Code Monétaire et Financier Français",
      "N°25005516",
      "N°BZIOB0001804",
      "N°BZIOB001804",
      "Lloyd’s Insurance Company S.A",
      "+Simple",
      "BNP PARIBAS",
      "ACPR",
    ].forEach((segment) => {
      expect(html).toContain(`<strong>${segment}</strong>`);
    });

    expect(html).toContain('<a href="https://www.orias.fr">www.orias.fr</a>');
    expect(html).toContain('<a href="https://www.plusimple.fr">www.plusimple.fr</a>');
    expect(html).toContain('<a href="https://www.bnpparibas.com">www.bnpparibas.com</a>');
    expect(html).toContain("FR76 3000 4029 9900 0106 8306 473");
    expect(html).toContain("établissement de crédit de droit français agrée et supervisé ,");
    expect(html).toContain("Immatriculée au RCS de Paris sous le numéro 662 042 449");
    expect(html).toContain("16 boulevard des Italiens");
    expect(html).toContain("ORIAS n° 07022 735");
    expect(html).toContain("IDF INNOVATION (02999)");
    expect(html).toContain("<strong>Gabriel BEFOLO NKOA</strong>");
    expect(html).toContain("Madame <strong>Awa Student</strong>");
    expect(html).toContain("la somme de 7 420 (7 420 FCFA) soit 7 420 (7 420 €)");
    expect(html).toContain("la somme de 618,33 (618,33 FCFA) soit 618,33 (618,33 €)");
    expect(html).toContain("<strong>Cette attestation est valable jusqu’au 02/07/2027.</strong>");
    expect(html).toContain(
      "<strong>Passé cette date, notre attestation deviendra automatiquement nulle et non avenue",
    );
    expect(html).toContain('<p class="signature-place">Fait à Pontarlier, le 02/07/2026</p>');
    expect(html).not.toContain("{{");
    expect(html).not.toContain("}}");
    expect(html).not.toContain("amountXafFormatted");
    expect(html).not.toContain("monthlyXafFormatted");
    expect(html).not.toContain("studentCivility");
    expect(html).not.toContain("adminNotes");
    expect(html).not.toContain("generatedBy");
    expect(html).not.toContain("storagePath");
    expect(html).not.toContain("debug");
    expect(html).not.toContain("partnerBankName");
    expect(html).not.toContain("partnerBankFooterLegal");
    expect(html).not.toContain("Document admin manuel");
    expect(html).not.toContain("QR reporté");
    expect(html).not.toContain("Texte juridique/business à valider");
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("phase P5C");
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
