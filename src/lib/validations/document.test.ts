import { describe, expect, it } from "vitest";
import {
  maxDocumentFileSize,
  sanitizeDocumentFileName,
  validateDocumentUpload,
} from "@/lib/validations/document";

describe("document upload validation", () => {
  it("sanitizes filenames and preserves allowed extensions", () => {
    expect(
      sanitizeDocumentFileName("Pièce d'identité 2026!!.PDF", "application/pdf"),
    ).toBe("piece-d-identite-2026.pdf");
  });

  it("accepts valid PDF files", () => {
    const file = new File(["valid"], "admission.pdf", {
      type: "application/pdf",
    });

    const result = validateDocumentUpload({
      uid: "user-1",
      documentType: "admission_letter",
      file,
    });

    expect(result.safeFileName).toBe("admission.pdf");
  });

  it("rejects unsupported file types", () => {
    const file = new File(["bad"], "notes.txt", { type: "text/plain" });

    expect(() =>
      validateDocumentUpload({
        uid: "user-1",
        documentType: "passport",
        file,
      }),
    ).toThrow(/Formats acceptes/);
  });

  it("rejects files larger than 5 MB", () => {
    const file = new File([new Uint8Array(maxDocumentFileSize + 1)], "big.pdf", {
      type: "application/pdf",
    });

    expect(() =>
      validateDocumentUpload({
        uid: "user-1",
        documentType: "passport",
        file,
      }),
    ).toThrow(/5 MB/);
  });
});

