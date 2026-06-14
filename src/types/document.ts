export type DocumentType =
  | "passport"
  | "admission_letter"
  | "proof_of_funds"
  | "bank_statement"
  | "visa"
  | "identity"
  | "identity_photo"
  | "housing"
  | "insurance"
  | "payment_proof"
  | "identity_document"
  | "accommodation_certificate"
  | "bank_document"
  | "other";

export type DocumentStatus =
  | "requested"
  | "pending"
  | "uploaded"
  | "generated"
  | "under_review"
  | "approved"
  | "validated"
  | "rejected"
  | "expired";

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
  caseId?: string | null;
  adminComment?: string | null;
  requestedAt?: Date | null;
  verificationStatus?: string | null;
  rejectionReason?: string | null;
  certificateId?: string | null;
  certificateNumber?: string | null;
  verificationUrl?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type UploadDocumentInput = {
  uid: string;
  documentType: DocumentType;
  file: File;
};
