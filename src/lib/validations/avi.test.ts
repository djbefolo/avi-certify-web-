import { describe, expect, it } from "vitest";
import {
  buildManualAviReference,
  manualAviTemplateVersion,
  parseManualAviPayload,
} from "./avi";

describe("manual AVI validation", () => {
  it("normalizes a valid manual AVI payload", () => {
    const payload = parseManualAviPayload({
      studentFullName: "  Awa Student  ",
      studentEmail: "awa@example.com",
      destinationCountry: "France",
      aviAmount: "7420,50",
      currency: "eur",
      academicYear: "2026-2027",
      issueDate: "2026-07-02",
      aviReference: "AVI-2026-MANUAL-TEST01",
      notesForAdmin: "Internal note only.",
    });

    expect(payload).toMatchObject({
      studentFullName: "Awa Student",
      aviAmount: 7420.5,
      currency: "EUR",
      aviReference: "AVI-2026-MANUAL-TEST01",
      templateVersion: manualAviTemplateVersion,
      notesForAdmin: "Internal note only.",
    });
  });

  it("rejects empty names, invalid amounts, and raw HTML", () => {
    expect(() =>
      parseManualAviPayload({
        studentFullName: "",
        aviAmount: 1,
        academicYear: "2026-2027",
      }),
    ).toThrow();

    expect(() =>
      parseManualAviPayload({
        studentFullName: "Awa Student",
        aviAmount: 0,
        academicYear: "2026-2027",
      }),
    ).toThrow();

    expect(() =>
      parseManualAviPayload({
        studentFullName: "<b>Awa Student</b>",
        aviAmount: 1_000,
        academicYear: "2026-2027",
      }),
    ).toThrow();
  });

  it("generates a readable manual reference without a Firestore counter", () => {
    expect(buildManualAviReference("2026-07-02", "abc123ef")).toBe(
      "AVI-2026-MANUAL-ABC123EF",
    );
  });
});

