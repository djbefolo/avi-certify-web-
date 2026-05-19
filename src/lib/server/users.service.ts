import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";

const USERS_COLLECTION = "users";

export const createUserProfileSchema = z
  .object({
    uid: z.string().min(1, "L'identifiant utilisateur est requis."),
    email: z
      .string()
      .trim()
      .email("L'adresse email est invalide.")
      .max(160, "L'adresse email est trop longue.")
      .transform((value) => value.toLowerCase()),
    fullName: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caracteres.")
      .max(80, "Le nom complet ne doit pas depasser 80 caracteres."),
    phone: z
      .string()
      .trim()
      .max(24, "Le telephone est trop long.")
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .strict();

export type CreateUserProfileInput = z.output<typeof createUserProfileSchema>;

type FirestoreServerTimestamp = ReturnType<typeof FieldValue.serverTimestamp>;

export type UserProfileDocument = {
  uid: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "student";
  status: "active";
  createdAt: FirestoreServerTimestamp;
  updatedAt: FirestoreServerTimestamp;
};

export function validateUserProfile(data: unknown): CreateUserProfileInput {
  return createUserProfileSchema.parse(data);
}

export function mapUserProfileToFirestore(
  data: CreateUserProfileInput,
): UserProfileDocument {
  return {
    uid: data.uid,
    email: data.email,
    fullName: data.fullName,
    phone: data.phone ?? null,
    role: "student",
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function createUserProfile(
  data: CreateUserProfileInput,
): Promise<{ id: string; created: boolean }> {
  const db = getAdminFirestore();
  const userRef = db.collection(USERS_COLLECTION).doc(data.uid);
  const existingProfile = await userRef.get();

  if (existingProfile.exists) {
    return { id: userRef.id, created: false };
  }

  await userRef.set(mapUserProfileToFirestore(data), { merge: false });

  return { id: userRef.id, created: true };
}
