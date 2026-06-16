import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateHousingCertificatePdf } from "@/lib/certificates/certificate-generator";

const readFileMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: readFileMock,
  },
  readFile: readFileMock,
}));

describe("certificate PDF generator", () => {
  beforeEach(() => {
    readFileMock.mockReset();
    readFileMock.mockRejectedValue(new Error("asset missing"));
  });

  it("does not read private signature or stamp assets", async () => {
    const pdf = await generateHousingCertificatePdf({
      certificateNumber: "AVI-HBG-2026-TEST",
      studentFullName: "Awa Student",
      dateOfBirth: "3 fevrier 2001",
      birthPlace: "Douala",
      nationality: "Camerounaise",
      targetSchoolName: "Universite test",
      housing: {
        region: "ile_de_france",
        city: "Paris",
        fullAddress: "12 Rue de la Chapelle, 75018 Paris",
        rent: 790,
        available: true,
      },
      entryDate: "1 septembre 2026",
      durationMonths: 12,
      issueDate: "16 juin 2026",
      verificationUrl: "https://www.avicertify.fr/verifier/test-token",
    });

    expect(pdf.byteLength).toBeGreaterThan(0);
    expect(
      readFileMock.mock.calls.some(([candidate]) =>
        String(candidate).toLowerCase().includes("signature"),
      ),
    ).toBe(false);
    expect(
      readFileMock.mock.calls.some(([candidate]) =>
        String(candidate).toLowerCase().includes("stamp"),
      ),
    ).toBe(false);
  });
});
