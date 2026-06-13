import { z } from "zod";
import type { DocumentType, UploadDocumentInput } from "@/types/document";

export const documentTypeValues = [
  "passport",
  "admission_letter",
  "proof_of_funds",
  "bank_statement",
  "visa",
  "identity",
  "identity_photo",
  "housing",
  "insurance",
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
const documentIdPattern = /^[A-Za-z0-9_-]+$/;
const safeFileNamePattern = /^[a-z0-9][a-z0-9-]{0,71}\.(pdf|jpg|png)$/;

export const documentTypeLabels: Record<DocumentType, string> = {
  passport: "Passeport",
  admission_letter: "Admission ou préinscription",
  proof_of_funds: "Justificatif de ressources",
  bank_statement: "Relevé bancaire",
  visa: "Visa",
  identity: "Pièce d'identité",
  identity_photo: "Photo d'identité",
  housing: "Logement",
  insurance: "Assurance",
  payment_proof: "Justificatif de paiement",
  identity_document: "Pièce d'identité",
  accommodation_certificate: "Attestation d'hébergement",
  bank_document: "Document bancaire",
  other: "Autre document",
};

export const documentUploadSchema = z.object({
  uid: z.string().min(1, "Utilisateur non authentifié."),
  documentType: z.enum(documentTypeValues, {
    errorMap: () => ({ message: "Sélectionnez un type de document." }),
  }),
  file: z.custom<File>(
    (value) => typeof File !== "undefined" && value instanceof File,
    "Sélectionnez un fichier valide.",
  ),
});

export const requestedDocumentUploadSchema = z.object({
  documentId: z.string().min(1).max(128).regex(documentIdPattern),
  documentType: z.enum(documentTypeValues),
  contentType: z.enum(acceptedDocumentMimeTypes),
  size: z.number().int().positive().max(maxDocumentFileSize),
  originalFileName: z
    .string()
    .min(1)
    .max(255)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  safeFileName: z.string().regex(safeFileNamePattern),
  storagePath: z.string().min(1).max(512),
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

export function isAcceptedDocumentMimeType(
  value: unknown,
): value is (typeof acceptedDocumentMimeTypes)[number] {
  return acceptedDocumentMimeTypes.includes(value as never);
}

export function isSafeDocumentFileName(
  safeFileName: string,
  originalFileName: string,
  contentType: string,
) {
  return (
    safeFileNamePattern.test(safeFileName) &&
    sanitizeDocumentFileName(originalFileName, contentType) === safeFileName
  );
}

export function validateDocumentUpload(input: UploadDocumentInput) {
  const parsed = documentUploadSchema.parse(input);

  if (!acceptedDocumentMimeTypes.includes(parsed.file.type as never)) {
    throw new Error("Formats acceptés : PDF, JPG ou PNG.");
  }

  if (parsed.file.size <= 0) {
    throw new Error("Le fichier sélectionné est vide.");
  }

  if (parsed.file.size > maxDocumentFileSize) {
    throw new Error("Le fichier ne doit pas dépasser 5 MB.");
  }

  return {
    ...parsed,
    safeFileName: sanitizeDocumentFileName(parsed.file.name, parsed.file.type),
  };
}
