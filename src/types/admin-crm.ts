export type AdminLeadCrmStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost";

export type AdminLeadCrmPriority = "low" | "normal" | "high";

export type AdminLead = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  destinationCountry: string | null;
  serviceInterest: string | null;
  projectHorizon: string | null;
  source: string;
  origin: string | null;
  status: string | null;
  marketingConsent: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
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
  convertedAt: string | null;
  lostReason: string | null;
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
  lostReason?: string | null;
};
