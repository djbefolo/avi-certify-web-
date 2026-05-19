import type { LeadFormValues } from "@/lib/validations/lead";
import type { DocumentType } from "@/types/document";
import type { PaymentServiceType } from "@/types/payment";

export type AnalyticsEventPayloads = {
  page_view: {
    path: string;
  };
  cta_clicked: {
    location: string;
    label: string;
    href?: string;
  };
  lead_submitted: {
    requestedService: LeadFormValues["requestedService"];
  };
  signup_started: {
    method: "email";
  };
  signup_completed: {
    method: "email";
  };
  login_completed: {
    method: "email";
  };
  document_uploaded: {
    documentType: DocumentType;
  };
  payment_started: {
    serviceType: PaymentServiceType;
  };
  checkout_started: {
    serviceType: PaymentServiceType;
  };
  logout_clicked: {
    location: string;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventPayloads;
