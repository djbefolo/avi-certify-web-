import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isBirthCountry } from "@/lib/profile/countries";

const USERS_COLLECTION = "users";

function isPastIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date < new Date()
  );
}

export const createUserProfileSchema = z
  .object({
    uid: z.string().min(1, "L'identifiant utilisateur est requis."),
    email: z
      .string()
      .trim()
      .email("L'adresse email est invalide.")
      .max(160, "L'adresse email est trop longue.")
      .transform((value) => value.toLowerCase()),
    firstName: z
      .string()
      .trim()
      .min(2, "Le prenom doit contenir au moins 2 caracteres.")
      .max(60, "Le prenom ne doit pas depasser 60 caracteres."),
    lastName: z
      .string()
      .trim()
      .min(2, "Le nom doit contenir au moins 2 caracteres.")
      .max(60, "Le nom ne doit pas depasser 60 caracteres."),
    birthDate: z
      .string()
      .trim()
      .refine(isPastIsoDate, "La date de naissance est invalide."),
    birthCountry: z
      .string()
      .refine(isBirthCountry, "Le pays de naissance est invalide."),
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

type TraceTouch = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
};

export type UserProfileDocument = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  birthCountry: string;
  dateOfBirth: string;
  phone: string | null;
  role: "student";
  status: "active";
  createdVia: "signup";
  profileSource: "firebase_auth";
  clientOrigin: "web_app";
  serviceInterest: string | null;
  lastIntent: "signup";
  marketingConsent: false;
  marketingConsentAt: FirestoreServerTimestamp | null;
  firstTouch: TraceTouch | null;
  lastTouch: TraceTouch | null;
  createdAt: FirestoreServerTimestamp;
  updatedAt: FirestoreServerTimestamp;
};

export function validateUserProfile(data: unknown): CreateUserProfileInput {
  return createUserProfileSchema.parse(data);
}

export function mapUserProfileToFirestore(
  data: CreateUserProfileInput,
): UserProfileDocument {
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  return {
    uid: data.uid,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName,
    birthDate: data.birthDate,
    birthCountry: data.birthCountry,
    dateOfBirth: data.birthDate,
    phone: data.phone ?? null,
    role: "student",
    status: "active",
    createdVia: "signup",
    profileSource: "firebase_auth",
    clientOrigin: "web_app",
    serviceInterest: null,
    lastIntent: "signup",
    marketingConsent: false,
    marketingConsentAt: null,
    firstTouch: null,
    lastTouch: null,
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
