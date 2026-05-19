export type DocumentType =
  | "passport"
  | "admission_letter"
  | "payment_proof"
  | "identity_document"
  | "accommodation_certificate"
  | "bank_document"
  | "other";

export type DocumentStatus =
  | "pending"
  | "uploaded"
  | "under_review"
  | "validated"
  | "rejected";

export type UserDocument = {
  id: string;
  ownerId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  originalFileName: string;
  safeFileName: string;
  contentType: "application/pdf" | "image/jpeg" | "image/png";
  size: number;
  storagePath: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UploadDocumentInput = {
  uid: string;
  documentType: DocumentType;
  file: File;
};
