import { describe, expect, it, vi } from "vitest";
import { generateHousingCertificatePdf } from "@/lib/certificates/certificate-generator";

describe("conditional housing certificate PDF", () => {
  it("builds a readable PDF with the repository AVI CERTIFY logo and QR code", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const buffer = await generateHousingCertificatePdf({
      certificateNumber: "AVI-HBG-2026-CASE0001",
      studentFullName: "Awa Student",
      dateOfBirth: "3 fevrier 2001",
      birthPlace: "Douala",
      nationality: "Camerounaise",
      targetSchoolName: "Universite test",
      housing: {
        city: "Paris",
        fullAddress: "1 rue Test, 75000 Paris",
        rent: 500,
      },
      entryDate: "1 septembre 2026",
      durationMonths: 12,
      issueDate: "3 aout 2026",
      validUntil: "30 septembre 2026",
      verificationUrl: "https://www.avicertify.fr/verifier/test-token-1234567890",
      templateVersion: "housing-conditional-v1",
    });
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(2_000);
    expect(buffer.toString("latin1")).toContain("%%EOF");
    expect(warning).not.toHaveBeenCalledWith(
      expect.stringContaining("AVI CERTIFY logo asset could not be loaded"),
      expect.anything(),
    );
    warning.mockRestore();
  });
});
