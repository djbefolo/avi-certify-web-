import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthStateCallback = (user: User | null) => void;

function getBrowserAuth() {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth client is only available in the browser.");
  }

  return getFirebaseAuth();
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(getBrowserAuth(), email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return createUserWithEmailAndPassword(getBrowserAuth(), email, password);
}

export async function signOutUser(): Promise<void> {
  await signOut(getBrowserAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getBrowserAuth(), email);
}

export async function sendVerificationEmail(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export function observeAuthState(callback: AuthStateCallback): () => void {
  return onAuthStateChanged(getBrowserAuth(), callback);
}
