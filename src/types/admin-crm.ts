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
