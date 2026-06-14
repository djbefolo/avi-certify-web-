import { describe, expect, it } from "vitest";
import {
  isSafeDocumentFileName,
  maxDocumentFileSize,
  requestedDocumentUploadSchema,
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
    ).toThrow(/Formats acceptés/);
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

  it("accepts only normalized server upload filenames", () => {
    expect(
      isSafeDocumentFileName(
        "piece-identite.pdf",
        "Pièce identité.PDF",
        "application/pdf",
      ),
    ).toBe(true);
    expect(
      isSafeDocumentFileName(
        "../piece-identite.pdf",
        "Pièce identité.PDF",
        "application/pdf",
      ),
    ).toBe(false);
  });

  it("requires complete metadata for a requested document upload", () => {
    expect(
      requestedDocumentUploadSchema.safeParse({
        documentId: "req_case_passport",
        documentType: "passport",
        contentType: "application/pdf",
        size: 1024,
        originalFileName: "passport.pdf",
        safeFileName: "passport.pdf",
        storagePath:
          "users/user-1/documents/req_case_passport-passport.pdf",
      }).success,
    ).toBe(true);
    expect(
      requestedDocumentUploadSchema.safeParse({
        documentType: "passport",
        contentType: "application/pdf",
        size: 1024,
      }).success,
    ).toBe(false);
  });
});
