import { z } from "zod";
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
    housingRequestId: z.string().trim().regex(/^[A-Za-z0-9_-]{8,160}$/).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.serviceType === "accommodation_certificate" && !value.housingRequestId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completez la demande de logement avant le paiement.",
        path: ["housingRequestId"],
      });
    }
  });

export type CheckoutRequestValues = z.output<typeof checkoutRequestSchema>;
