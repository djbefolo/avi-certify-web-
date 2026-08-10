import type { PaymentServiceType } from "@/types/payment";

export type PaymentServiceConfig = {
  type: PaymentServiceType;
  label: string;
  description: string;
  amount: number;
  currency: "eur";
  metadata: {
    serviceCode: PaymentServiceType;
    productFamily: "student_services";
  };
};

export const paymentServiceConfigs: Record<
  PaymentServiceType,
  PaymentServiceConfig
> = {
  avi_support: {
    type: "avi_support",
    label: "Accompagnement AVI",
    description: "Preparation et suivi du dossier AVI et financier.",
    amount: 9900,
    currency: "eur",
    metadata: {
      serviceCode: "avi_support",
      productFamily: "student_services",
    },
  },
  accommodation_certificate: {
    type: "accommodation_certificate",
    label: "Attestation d'hebergement",
    description: "Accompagnement pour l'attestation d'hebergement.",
    amount: 9900,
    currency: "eur",
    metadata: {
      serviceCode: "accommodation_certificate",
      productFamily: "student_services",
    },
  },
  student_prefinancing: {
    type: "student_prefinancing",
    label: "Prefinancement etudiant",
    description: "Analyse et structuration du parcours de prefinancement.",
    amount: 14900,
    currency: "eur",
    metadata: {
      serviceCode: "student_prefinancing",
      productFamily: "student_services",
    },
  },
  visa_support: {
    type: "visa_support",
    label: "Accompagnement visa",
    description: "Preparation du parcours visa et verification du dossier.",
    amount: 11900,
    currency: "eur",
    metadata: {
      serviceCode: "visa_support",
      productFamily: "student_services",
    },
  },
  full_package: {
    type: "full_package",
    label: "Pack complet",
    description: "Accompagnement AVI, documents, financement et visa.",
    amount: 24900,
    currency: "eur",
    metadata: {
      serviceCode: "full_package",
      productFamily: "student_services",
    },
  },
};

export const paymentServiceOptions = Object.values(paymentServiceConfigs);

export function formatPaymentAmount(amount: number, currency: "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amount / 100);
}
