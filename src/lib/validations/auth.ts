import { z } from "zod";
import { isBirthCountry } from "@/lib/profile/countries";

const passwordPolicyMessage =
  "Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule, un chiffre et un caractere special.";

function isPastIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date < new Date()
  );
}

export const registerSchema = z
  .object({
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
      .refine(isPastIsoDate, "Selectionnez une date de naissance valide."),
    birthCountry: z
      .string()
      .refine(isBirthCountry, "Selectionnez votre pays de naissance."),
    phone: z
      .string()
      .trim()
      .max(24, "Le telephone est trop long.")
      .optional()
      .transform((value) => (value ? value : undefined)),
    email: z
      .string()
      .trim()
      .email("Renseignez une adresse email valide.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, passwordPolicyMessage)
      .regex(/[A-Z]/, passwordPolicyMessage)
      .regex(/[a-z]/, passwordPolicyMessage)
      .regex(/[0-9]/, passwordPolicyMessage)
      .regex(/[^A-Za-z0-9]/, passwordPolicyMessage),
    confirmPassword: z.string().min(1, "Confirmez votre mot de passe."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
