export type ApplicationStatus =
  | "draft"
  | "documents_pending"
  | "in_review"
  | "payment_pending"
  | "validated"
  | "blocked";

export type DocumentStatus =
  | "missing"
  | "pending_review"
  | "approved"
  | "rejected";

export type PaymentStatus = "not_started" | "pending" | "paid" | "failed";

export type TimelineStepStatus = "completed" | "current" | "upcoming";

export type TimelineStep = {
  id: string;
  title: string;
  description: string;
  status: TimelineStepStatus;
  dateLabel?: string;
};

export type ApplicationDocument = {
  id: string;
  title: string;
  description: string;
  status: DocumentStatus;
  required: boolean;
};

export type ApplicationPayment = {
  status: PaymentStatus;
  amountLabel: string;
  description: string;
};
