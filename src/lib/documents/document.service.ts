import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { uploadUserDocument } from "@/lib/firebase/storage";
import { validateDocumentUpload } from "@/lib/validations/document";
import type {
  DocumentStatus,
  DocumentType,
  UploadDocumentInput,
  UserDocument,
} from "@/types/document";

const DOCUMENTS_COLLECTION = "documents";

type CreateDocumentMetadataParams = {
  documentId: string;
  uid: string;
  documentType: DocumentType;
  file: File;
  safeFileName: string;
  storagePath: string;
};

type UploadDocumentParams = UploadDocumentInput & {
  onProgress?: (progress: number) => void;
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

function mapDocumentSnapshot(id: string, data: DocumentData): UserDocument {
  return {
    id,
    ownerId: String(data.ownerId),
    documentType: data.documentType as DocumentType,
    status: data.status as DocumentStatus,
    originalFileName: String(data.originalFileName ?? data.safeFileName ?? "Document demandé"),
    safeFileName: String(data.safeFileName ?? data.originalFileName ?? "document"),
    contentType: (data.contentType ?? "application/pdf") as UserDocument["contentType"],
    size: Number(data.size ?? 0),
    storagePath: String(data.storagePath ?? ""),
    caseId: typeof data.caseId === "string" ? data.caseId : null,
    adminComment: typeof data.adminComment === "string" ? data.adminComment : null,
    requestedAt: toDate(data.requestedAt),
    verificationStatus:
      typeof data.verificationStatus === "string" ? data.verificationStatus : null,
    rejectionReason:
      typeof data.rejectionReason === "string" ? data.rejectionReason : null,
    certificateId:
      typeof data.certificateId === "string" ? data.certificateId : null,
    paymentId: typeof data.paymentId === "string" ? data.paymentId : null,
    certificateNumber:
      typeof data.certificateNumber === "string" ? data.certificateNumber : null,
    verificationUrl:
      typeof data.verificationUrl === "string" ? data.verificationUrl : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createDocumentMetadata({
  documentId,
  uid,
  documentType,
  file,
  safeFileName,
  storagePath,
}: CreateDocumentMetadataParams): Promise<UserDocument> {
  const db = getFirebaseDb();
  const documentRef = doc(db, DOCUMENTS_COLLECTION, documentId);
  const metadata = {
    ownerId: uid,
    documentType,
    status: "uploaded" satisfies DocumentStatus,
    originalFileName: file.name,
    safeFileName,
    contentType: file.type,
    size: file.size,
    storagePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(documentRef, metadata);

  return {
    id: documentId,
    ownerId: uid,
    documentType,
    status: "uploaded",
    originalFileName: file.name,
    safeFileName,
    contentType: file.type as UserDocument["contentType"],
    size: file.size,
    storagePath,
    certificateId: null,
    certificateNumber: null,
    verificationUrl: null,
    createdAt: null,
    updatedAt: null,
  };
}

export async function uploadDocument({
  uid,
  documentType,
  file,
  onProgress,
}: UploadDocumentParams): Promise<UserDocument> {
  const validated = validateDocumentUpload({ uid, documentType, file });
  const db = getFirebaseDb();
  const existingDocuments = await listUserDocuments(uid);
  const requestedDocument = existingDocuments.find(
    (document) =>
      document.documentType === validated.documentType &&
      ["requested", "rejected", "correction_requested"].includes(
        document.status as string,
      ),
  );
  const token = await getFirebaseAuth().currentUser?.getIdToken();
  if (requestedDocument && !token) {
    throw new Error("Session utilisateur requise pour ce document.");
  }

  const documentRef = requestedDocument
    ? doc(db, DOCUMENTS_COLLECTION, requestedDocument.id)
    : doc(collection(db, DOCUMENTS_COLLECTION));
  const uploadResult = await uploadUserDocument({
    uid,
    documentId: documentRef.id,
    safeFileName: validated.safeFileName,
    file: validated.file,
    onProgress,
  });

  if (requestedDocument) {
    const response = await fetch("/api/client/documents/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token as string}`,
      },
      body: JSON.stringify({
        documentId: requestedDocument.id,
        documentType: validated.documentType,
        contentType: validated.file.type,
        size: validated.file.size,
        originalFileName: validated.file.name,
        safeFileName: validated.safeFileName,
        storagePath: uploadResult.storagePath,
      }),
    });
    if (!response.ok) {
      throw new Error("Synchronisation du document demandé impossible.");
    }

    return {
      ...requestedDocument,
      status: "uploaded",
      originalFileName: validated.file.name,
      safeFileName: validated.safeFileName,
      contentType: validated.file.type as UserDocument["contentType"],
      size: validated.file.size,
      storagePath: uploadResult.storagePath,
      updatedAt: new Date(),
    };
  }

  return createDocumentMetadata({
    documentId: documentRef.id,
    uid,
    documentType: validated.documentType,
    file: validated.file,
    safeFileName: validated.safeFileName,
    storagePath: uploadResult.storagePath,
  });
}

export async function listUserDocuments(uid: string): Promise<UserDocument[]> {
  const db = getFirebaseDb();
  const documentsQuery = query(
    collection(db, DOCUMENTS_COLLECTION),
    where("ownerId", "==", uid),
  );
  const snapshot = await getDocs(documentsQuery);

  return snapshot.docs
    .map((documentSnapshot) =>
      mapDocumentSnapshot(documentSnapshot.id, documentSnapshot.data()),
    )
    .sort((a, b) => {
      const aTime = a.createdAt?.getTime() ?? 0;
      const bTime = b.createdAt?.getTime() ?? 0;

      return bTime - aTime;
    });
}

export async function getGeneratedCertificateDocument(
  uid: string,
  paymentId: string,
): Promise<UserDocument | null> {
  const documents = await listUserDocuments(uid);

  return (
    documents.find(
      (document) =>
        (document.id === paymentId || document.paymentId === paymentId) &&
        document.ownerId === uid &&
        document.documentType === "accommodation_certificate" &&
        document.status === "generated",
    ) ?? null
  );
}
