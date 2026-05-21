export type ApplicationStatus =
  | "account_created"
  | "documents_pending"
  | "ready_for_payment"
  | "payment_pending"
  | "payment_confirmed"
  | "under_review"
  | "approved"
  | "rejected";

export type DocumentStatus =
  | "missing"
  | "pending_review"
  | "approved"
  | "rejected";

export type PaymentStatus = "not_started" | "pending" | "paid" | "failed" | "refunded";

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
  workflowStatus?: "missing" | "uploaded" | "under_review" | "approved" | "rejected";
  required: boolean;
};

export type ApplicationPayment = {
  id?: string;
  status: PaymentStatus;
  amountLabel: string;
  description: string;
};
