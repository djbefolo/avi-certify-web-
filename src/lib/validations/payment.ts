import { z } from "zod";
import { housingRegionCodes } from "@/lib/housing/housing-regions";
import type { PaymentServiceType } from "@/types/payment";

export const paymentServiceValues = [
  "avi_support",
  "accommodation_certificate",
  "student_prefinancing",
  "visa_support",
  "full_package",
] as const satisfies readonly PaymentServiceType[];

export const checkoutRequestSchema = z
  .object({
    serviceType: z.enum(paymentServiceValues, {
      errorMap: () => ({ message: "Service de paiement invalide." }),
    }),
    housingRegion: z.enum(housingRegionCodes).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.serviceType === "accommodation_certificate" && !value.housingRegion) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sélectionnez une région pour l'attestation d'hébergement.",
        path: ["housingRegion"],
      });
    }
  });

export type CheckoutRequestValues = z.output<typeof checkoutRequestSchema>;
