export type CanonicalLeadCrmStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "CONVERTED"
  | "LOST";

export type CanonicalLeadSource =
  | "PUBLIC_CONTACT_FORM"
  | "GUIDE_DOWNLOAD"
  | "PRICING"
  | "SIGNUP"
  | "PROFILE"
  | "UNKNOWN";

export type CanonicalLead = {
  id: string;
  fullName: string | null;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  residenceCountry: string | null;
  destinationCountry: string | null;
  requestedService: string | null;
  projectHorizon: string | null;
  message: string | null;
  source: CanonicalLeadSource;
  sourceDetail: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  crmStatus: CanonicalLeadCrmStatus;
  marketingConsent: boolean;
  contactConsent: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  linkedUid: string | null;
  linkedAt: string | null;
  linkMethod: string | null;
  rawSource: string | null;
  rawStatus: string | null;
};
