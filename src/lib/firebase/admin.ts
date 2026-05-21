import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Firebase Admin env var: ${name}`);
  }

  return value;
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

export function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  return initializeApp({
    credential: cert({
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: normalizePrivateKey(getRequiredEnv("FIREBASE_PRIVATE_KEY")),
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getFirebaseAdminApp());
}
