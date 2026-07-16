import type { AdminRole } from "@/lib/admin/admin-auth";

export type AdminCaseProductType =
  | "TO_QUALIFY"
  | "AVI_UNKNOWN"
  | "AVI"
  | "PREFINANCEMENT"
  | "ATTESTATION_HEBERGEMENT"
  | "DOSSIER_VISA"
  | "MOBILITY_PACKAGE";

export type AdminCaseStatus =
  | "NEW"
  | "PROFILE_INCOMPLETE"
  | "DOCUMENTS_PENDING"
  | "DOCUMENTS_SUBMITTED"
  | "UNDER_REVIEW"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "FINANCE_SIMULATED"
  | "QUOTE_GENERATED"
  | "REPORT_GENERATED"
  | "AVI_READY"
  | "CERTIFICATE_GENERATED"
  | "COMPLETED"
  | "BLOCKED";

export type AdminCaseDocumentStatus =
  | "MISSING"
  | "PARTIAL"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export type AdminCasePaymentStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "REFUNDED";

export type AdminCaseFinanceStatus =
  | "NOT_STARTED"
  | "SIMULATED"
  | "QUOTE_GENERATED"
  | "REPORT_GENERATED"
  | "SENT_TO_CLIENT";

export type AdminCaseCertificateStatus =
  | "NOT_STARTED"
  | "GENERATED"
  | "SENT"
  | "VERIFIED"
  | "REVOKED";

export type AdminClientProfile = {
  uid: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  countryOfOrigin: string | null;
  destinationCountry: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  accountStatus: "ACTIVE" | "DISABLED" | "UNKNOWN";
  onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
  currentCaseId: string | null;
  tags: string[];
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignedAdminId: string | null;
  source: "firebase_auth_sync" | "user_profile" | "admin_created";
  updatedAt: string;
};

export type ClientCase = {
  id: string;
  uid: string;
  caseNumber: string;
  clientEmail?: string | null;
  clientName?: string | null;
  productType: AdminCaseProductType;
  status: AdminCaseStatus;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  requestedAmount: number | null;
  requestedCurrency: string | null;
  region?: "canada" | "eu" | string | null;
  destinationCountry: string | null;
  destinationSchool?: string | null;
  schoolName: string | null;
  intakeDate: string | null;
  paymentStatus?: AdminCasePaymentStatus;
  documentStatus?: AdminCaseDocumentStatus;
  financeStatus?: AdminCaseFinanceStatus;
  certificateStatus?: AdminCaseCertificateStatus;
  nextAction?: string | null;
  assignedAdminId?: string | null;
  notes: string | null;
  source?: "firebase_auth_sync" | "admin_created" | "client_request" | "reconciliation";
  createdAt: string;
  updatedAt: string;
};

export type ClientDocument = {
  id: string;
  uid: string;
  caseId: string | null;
  clientEmail?: string | null;
  clientName?: string | null;
  documentType: string;
  fileName: string;
  storagePath: string;
  mimeType?: string | null;
  size?: number | null;
  downloadUrl: string | null;
  uploadStatus: string;
  uploadedBy?: "CLIENT" | "ADMIN" | "SYSTEM" | string | null;
  source?: "CLIENT" | "ADMIN" | "SYSTEM";
  verificationStatus:
    | "REQUESTED"
    | "UPLOADED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "PENDING"
    | "CORRECTION_REQUESTED";
  rejectionReason: string | null;
  requestedAt?: string | null;
  uploadedAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  expiresAt?: string | null;
  isRequired?: boolean;
  deliveryStatus?: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | null;
  ownerResolution?: {
    uid: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    source:
      | "admin_client_profile"
      | "users"
      | "auth"
      | "client_case"
      | "lead_match"
      | "document_metadata"
      | "unresolved";
    status:
      | "RESOLVED"
      | "PROFILE_SYNC_REQUIRED"
      | "LEAD_NOT_CONVERTED"
      | "UNRESOLVED";
    caseId: string | null;
    leadId: string | null;
    canOpenClient360: boolean;
    warning: string | null;
  };
};

export type CommunicationLog = {
  id: string;
  caseId: string | null;
  uid: string | null;
  type: "DOCUMENT_REQUEST" | "ADMIN_NOTIFICATION" | "EMAIL" | "SYSTEM";
  template: string | null;
  recipient: string | null;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED" | "NOT_SENT";
  provider: "resend" | "internal" | "system";
  messageId: string | null;
  subject?: string | null;
  body?: string | null;
  createdAt: string;
};

export type ClientFinancialFile = {
  id: string;
  uid: string;
  caseId: string;
  simulationId: string | null;
  quoteId: string | null;
  reportId: string | null;
  productCode: string | null;
  region: "canada" | "eu" | string | null;
  xafAmount: number | null;
  option: string | null;
  riskTier: string | null;
  status:
    | "DRAFT"
    | "SIMULATED"
    | "QUOTED"
    | "SENT"
    | "REPORTED"
    | "ARCHIVED";
  reportStatus?: "DRAFT" | "PENDING_GENERATION" | "GENERATED";
  createdAt: string;
  updatedAt: string;
};

export type AdminNotification = {
  id: string;
  type:
    | "new_user_registered"
    | "new_case_created"
    | "document_uploaded"
    | "payment_started"
    | "payment_succeeded"
    | "certificate_generated"
    | "admin_action_required"
    | "auth_users_synced";
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  body: string;
  relatedUid: string | null;
  relatedCaseId: string | null;
  read: boolean;
  createdAt: string;
};

export type AdminCaseEvent = {
  id: string;
  caseId: string | null;
  uid: string | null;
  actorType: "admin" | "system" | "client";
  actorId: string | null;
  actorRole: AdminRole | "system" | "client";
  eventType: string;
  eventLabel: string;
  eventPayload: Record<string, unknown>;
  createdAt: string;
};

export type AdminClient360 = {
  profile: AdminClientProfile | null;
  cases: ClientCase[];
  documents: ClientDocument[];
  documentDiagnostics: {
    firebaseProjectId: string | null;
    resolvedUid: string;
    authUid: string | null;
    email: string | null;
    caseIds: string[];
    firestoreCounts: {
      documents: number;
      clientDocuments: number;
    };
    storage: {
      status: "CHECKED" | "NOT_CONFIGURED" | "ERROR";
      bucketName: string | null;
      fileCount: number | null;
      orphanedFileCount: number | null;
    };
    sourcesQueried: string[];
    lastRefresh: string;
    message: string;
    error: string | null;
  };
  payments: Array<Record<string, unknown>>;
  financialFiles: ClientFinancialFile[];
  certificates: Array<Record<string, unknown>>;
  communications: CommunicationLog[];
  timeline: AdminCaseEvent[];
};

export type AdminOperationsOverview = {
  newRegistrationsToday: number;
  newCasesToday: number;
  documentsAwaitingReview: number;
  paymentsPending: number;
  paymentsConfirmed: number;
  certificatesGenerated: number;
  casesBlocked: number;
  clientsTotal: number;
  casesTotal: number;
  unreadNotifications: number;
};
