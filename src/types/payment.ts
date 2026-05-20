export type PaymentServiceType =
  | "avi_support"
  | "accommodation_certificate"
  | "student_prefinancing"
  | "visa_support"
  | "full_package";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export type PaymentRecord = {
  id: string;
  ownerId: string;
  serviceType: PaymentServiceType;
  serviceLabel: string;
  amount: number;
  currency: "eur";
  status: PaymentStatus;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  stripeSessionId?: string | null;
  paymentIntentId?: string | null;
  stripeChargeId?: string | null;
  checkoutUrl: string | null;
  amountTotal?: number | null;
  amountRefunded?: number | null;
  customerEmail?: string | null;
  productFamily?: string | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  refundedAt?: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CreateCheckoutSessionInput = {
  serviceType: PaymentServiceType;
};
