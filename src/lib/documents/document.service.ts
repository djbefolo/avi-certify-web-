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
import { getFirebaseDb } from "@/lib/firebase/client";
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
    originalFileName: String(data.originalFileName),
    safeFileName: String(data.safeFileName),
    contentType: data.contentType as UserDocument["contentType"],
    size: Number(data.size),
    storagePath: String(data.storagePath),
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
  const documentRef = doc(collection(db, DOCUMENTS_COLLECTION));
  const uploadResult = await uploadUserDocument({
    uid,
    documentId: documentRef.id,
    safeFileName: validated.safeFileName,
    file: validated.file,
    onProgress,
  });

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
