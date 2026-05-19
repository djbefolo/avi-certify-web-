import { z } from "zod";

export const registerSchema = z
  .object({
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
    email: z
      .string()
      .trim()
      .email("Renseignez une adresse email valide.")
      .transform((value) => value.toLowerCase()),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirmez votre mot de passe."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;

