import { z } from "zod";
import {
  destinationCountryValues,
  requestedServiceValues,
  residenceCountryValues,
} from "../../constants/lead-options.ts";

const nameRegex = /^[\p{L}\p{M}' -]+$/u;
const phoneRegex = /^\+?[0-9][0-9\s().-]{7,23}$/;

const requiredEnumMessage = "Sélectionnez une option.";

function requiredSelect<const TValues extends readonly [string, ...string[]]>(
  values: TValues,
) {
  return z
    .union([z.enum(values), z.literal("")], {
      errorMap: () => ({ message: requiredEnumMessage }),
    })
    .refine((value) => value !== "", {
      message: requiredEnumMessage,
    })
    .transform((value) => value as TValues[number]);
}

export const leadFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Le nom complet doit contenir au moins 2 caractères.")
      .max(80, "Le nom complet ne doit pas dépasser 80 caractères.")
      .regex(
        nameRegex,
        "Le nom ne doit contenir que des lettres, espaces, apostrophes et tirets.",
      ),
    phone: z
      .string()
      .trim()
      .min(8, "Le numéro WhatsApp est trop court.")
      .max(24, "Le numéro WhatsApp est trop long.")
      .regex(
        phoneRegex,
        "Utilisez un numéro valide, idéalement au format international.",
      )
      .refine(
        (value) => {
          const digits = value.replace(/\D/g, "");

          return digits.length >= 8 && digits.length <= 15;
        },
        "Le numéro doit contenir entre 8 et 15 chiffres.",
      ),
    email: z
      .string()
      .trim()
      .email("Renseignez une adresse email valide.")
      .max(160, "L'adresse email ne doit pas dépasser 160 caractères.")
      .transform((value) => value.toLowerCase()),
    residenceCountry: requiredSelect(residenceCountryValues),
    destinationCountry: requiredSelect(destinationCountryValues),
    requestedService: requiredSelect(requestedServiceValues),
    message: z
      .string()
      .trim()
      .max(800, "Le message ne doit pas dépasser 800 caractères.")
      .optional()
      .transform((value) => (value ? value : undefined)),
    consent: z.boolean().refine((value) => value, {
      message: "Vous devez accepter le traitement de vos informations.",
    }),
  })
  .strict();

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormValues = z.output<typeof leadFormSchema>;
