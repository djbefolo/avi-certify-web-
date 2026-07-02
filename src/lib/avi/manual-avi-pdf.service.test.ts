import { describe, expect, it } from "vitest";
import { parseManualAviPayload } from "@/lib/validations/avi";
import { generateManualAviPdf } from "./manual-avi-pdf.service";

describe("manual AVI PDF generator", () => {
  it("builds a PDF from a validated admin-only payload", async () => {
    const payload = parseManualAviPayload({
      studentFullName: "Awa Student",
      studentEmail: "awa@example.com",
      destinationCountry: "France",
      originCountry: "Cameroun",
      aviAmount: 7420,
      currency: "EUR",
      academicYear: "2026-2027",
      schoolName: "Universite test",
      issueDate: "2026-07-02",
      aviReference: "AVI-2026-MANUAL-TEST01",
      internalCaseReference: "CASE-1",
      notesForAdmin: "Do not print this note.",
    });

    const buffer = await generateManualAviPdf(payload);

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.length).toBeGreaterThan(500);
  });
});

