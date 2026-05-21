import { z } from "zod";
import type { DocumentType, UploadDocumentInput } from "@/types/document";

export const documentTypeValues = [
  "passport",
  "admission_letter",
  "payment_proof",
  "identity_document",
  "accommodation_certificate",
  "bank_document",
  "other",
] as const;

export const acceptedDocumentMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const maxDocumentFileSize = 5 * 1024 * 1024;

export const documentTypeLabels: Record<DocumentType, string> = {
  passport: "Passeport",
  admission_letter: "Admission ou pre-inscription",
  payment_proof: "Justificatif de paiement",
  identity_document: "Piece d'identite",
  accommodation_certificate: "Attestation d’hébergement",
  bank_document: "Document bancaire",
  other: "Autre document",
};

export const documentUploadSchema = z.object({
  uid: z.string().min(1, "Utilisateur non authentifie."),
  documentType: z.enum(documentTypeValues, {
    errorMap: () => ({ message: "Selectionnez un type de document." }),
  }),
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Selectionnez un fichier valide.",
  ),
});

function getFileExtension(fileName: string, contentType: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && ["pdf", "jpg", "jpeg", "png"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (contentType === "application/pdf") {
    return "pdf";
  }

  if (contentType === "image/png") {
    return "png";
  }

  return "jpg";
}

export function sanitizeDocumentFileName(fileName: string, contentType: string) {
  const extension = getFileExtension(fileName, contentType);
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return `${baseName || "document"}.${extension}`;
}

export function validateDocumentUpload(input: UploadDocumentInput) {
  const parsed = documentUploadSchema.parse(input);

  if (!acceptedDocumentMimeTypes.includes(parsed.file.type as never)) {
    throw new Error("Formats acceptes : PDF, JPG ou PNG.");
  }

  if (parsed.file.size <= 0) {
    throw new Error("Le fichier selectionne est vide.");
  }

  if (parsed.file.size > maxDocumentFileSize) {
    throw new Error("Le fichier ne doit pas depasser 5 MB.");
  }

  return {
    ...parsed,
    safeFileName: sanitizeDocumentFileName(parsed.file.name, parsed.file.type),
  };
}
