import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";

type UploadUserDocumentParams = {
  uid: string;
  documentId: string;
  safeFileName: string;
  file: File;
  onProgress?: (progress: number) => void;
};

type UploadUserDocumentResult = {
  storagePath: string;
  snapshot: UploadTaskSnapshot;
};

export function buildUserDocumentPath(
  uid: string,
  documentId: string,
  safeFileName: string,
) {
  return `users/${uid}/documents/${documentId}-${safeFileName}`;
}

export async function uploadUserDocument({
  uid,
  documentId,
  safeFileName,
  file,
  onProgress,
}: UploadUserDocumentParams): Promise<UploadUserDocumentResult> {
  const storage = getFirebaseStorage();
  const storagePath = buildUserDocumentPath(uid, documentId, safeFileName);
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      ownerId: uid,
      documentId,
    },
  });

  const snapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (currentSnapshot) => {
        const progress =
          currentSnapshot.totalBytes > 0
            ? Math.round(
                (currentSnapshot.bytesTransferred /
                  currentSnapshot.totalBytes) *
                  100,
              )
            : 0;

        onProgress?.(progress);
      },
      reject,
      () => resolve(uploadTask.snapshot),
    );
  });

  return {
    storagePath,
    snapshot,
  };
}

export async function getUserDocumentDownloadUrl(path: string) {
  return getDownloadURL(ref(getFirebaseStorage(), path));
}
