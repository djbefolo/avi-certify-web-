import type {
  CanonicalLead,
  CanonicalLeadCrmStatus,
} from "@/types/lead";

export type AdminLeadCrmStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";

export type AdminLeadCrmPriority = "low" | "normal" | "high";

export type AdminLeadQualificationReadiness =
  | "INCOMPLETE"
  | "READY_FOR_REVIEW";

export type AdminLeadProfileReadiness =
  | "INCOMPLETE"
  | "SUFFICIENT_FOR_QUALIFICATION"
  | "COMPLETE";

export type AdminLeadNextAction =
  | "NONE"
  | "CALL_PROSPECT"
  | "WHATSAPP_PROSPECT"
  | "EMAIL_PROSPECT"
  | "REQUEST_INFORMATION"
  | "REVIEW_PROFILE"
  | "REVIEW_AMBIGUOUS_LINK"
  | "FOLLOW_UP";

export type AdminLeadNextActionSource =
  | "HUMAN_ADMIN"
  | "SYSTEM_PROFILE_REMINDER";

export type AdminLeadLostReason =
  | "NO_RESPONSE"
  | "NOT_INTERESTED"
  | "NOT_ELIGIBLE"
  | "DUPLICATE"
  | "OUT_OF_SCOPE"
  | "OTHER";

export type AdminLeadQualificationReason =
  | "CONTACT_AVAILABLE"
  | "PHONE_AVAILABLE"
  | "DESTINATION_KNOWN"
  | "REQUESTED_SERVICE_KNOWN"
  | "PROJECT_HORIZON_KNOWN"
  | "IDENTITY_LINKED";

export type AdminLead = Omit<
  CanonicalLead,
  "fullName" | "email" | "crmStatus" | "createdAt" | "updatedAt"
> & {
  fullName: string;
  email: string;
  canonicalCrmStatus: CanonicalLeadCrmStatus;
  country: string | null;
  serviceInterest: string | null;
  origin: string | null;
  status: string | null;
  referrer: string | null;
  guideRequested: boolean;
  guideDelivered: boolean;
  guideDeliveryStatus: string | null;
  guideDeliveryChannel: string | null;
  guideEmailSent: boolean | null;
  guideEmailStatus: string | null;
  crmStatus: AdminLeadCrmStatus;
  crmPriority: AdminLeadCrmPriority;
  crmOwner: string | null;
  crmNotes: string | null;
  lastContactedAt: string | null;
  qualifiedAt: string | null;
  qualifiedBy: string | null;
  qualificationReasons: AdminLeadQualificationReason[];
  convertedAt: string | null;
  lostReason: string | null;
  nextAction: AdminLeadNextAction;
  nextActionDueAt: string | null;
  followUpReason: string | null;
  nextActionSource: AdminLeadNextActionSource | null;
  nextActionUpdatedAt: string | null;
  nextActionUpdatedBy: string | null;
  qualificationReadiness: AdminLeadQualificationReadiness;
  qualificationMissingFields: string[];
  profileReadiness: AdminLeadProfileReadiness;
  profileCompletionPercent: number | null;
  linkedAccountEmailVerified: boolean | null;
  humanFollowUpRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminLeadStats = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  guideSucceeded: number;
  guideEmailFailures: number;
};

export type AdminLeadUpdateInput = {
  crmStatus?: AdminLeadCrmStatus;
  crmPriority?: AdminLeadCrmPriority;
  crmOwner?: string | null;
  crmNotes?: string | null;
  lastContactedAt?: string | null;
  lostReason?: AdminLeadLostReason | null;
  nextAction?: AdminLeadNextAction;
  nextActionDueAt?: string | null;
  followUpReason?: string | null;
};

export type AdminProspect360Account = {
  uidMasked: string | null;
  status: "ACTIVE" | "DISABLED" | "UNKNOWN" | "NOT_LINKED";
  createdAt: string | null;
  emailVerifiedAt: string | null;
};

export type AdminProspect360Communication = {
  id: string;
  channel: "EMAIL" | "SYSTEM" | "ADMIN_NOTIFICATION" | "DOCUMENT_REQUEST";
  label: string;
  status: string;
  occurredAt: string;
};

export type AdminProspect360Document = {
  id: string;
  fileName: string;
  documentType: string;
  status: string;
  uploadedAt: string | null;
  previewUrl: string;
};

export type AdminProspect360Note = {
  id: string;
  note: string;
  createdAt: string;
  createdBy: string | null;
};

export type AdminProspect360TimelineItem = {
  id: string;
  kind: "LEAD" | "ACCOUNT" | "COMMUNICATION" | "DOCUMENT" | "CRM" | "SYSTEM";
  label: string;
  occurredAt: string;
  actor: string | null;
};

export type AdminProspect360Onboarding = {
  accountCreatedAt: string | null;
  emailVerifiedAt: string | null;
  welcomeEmailStatus: string | null;
  welcomeEmailAt: string | null;
  profileReminderStatus: string | null;
  profileReminderAt: string | null;
  profileReminderDueAt: string | null;
  reminderAttemptCount: number | null;
  humanFollowUpStatus: string | null;
  humanFollowUpDueAt: string | null;
  humanFollowUpCreatedAt: string | null;
  humanFollowUpResolvedAt: string | null;
};

export type AdminProspect360 = {
  lead: AdminLead;
  account: AdminProspect360Account;
  onboarding: AdminProspect360Onboarding;
  communications: AdminProspect360Communication[];
  documents: AdminProspect360Document[];
  notes: AdminProspect360Note[];
  timeline: AdminProspect360TimelineItem[];
};
