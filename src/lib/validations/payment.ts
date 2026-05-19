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
  })
  .strict();

export type CheckoutRequestValues = z.output<typeof checkoutRequestSchema>;

