import type {
  CountryReference,
  NationalityReference,
} from "@/lib/profile/country-reference";

export type HousingAvailabilityStatus =
  | "conditionally_available"
  | "limited"
  | "unavailable";

export type HousingRequestStatus =
  | "draft"
  | "awaiting_payment"
  | "payment_pending"
  | "payment_confirmed"
  | "auto_validation_pending"
  | "auto_approved_generation_queued"
  | "requires_admin_review"
  | "admin_review_in_progress"
  | "admin_approved_generation_queued"
  | "generation_processing"
  | "allocation_pending"
  | "conditionally_reserved"
  | "certificate_generation_pending"
  | "certificate_generated"
  | "certificate_delivered"
  | "replaced"
  | "revoked"
  | "expired"
  | "failed";

export type HousingAccommodationType =
  | "studio"
  | "t1_bis"
  | "t2"
  | "shared"
  | "other";

export type HousingLocation = {
  code: string;
  country: "France";
  zone: string;
  label: string;
  indicativeMonthlyRent: number;
  currency: "EUR";
  partnerCoverageCount: number;
  availabilityStatus: HousingAvailabilityStatus;
};

export type HousingInventoryStatus =
  | "draft"
  | "available"
  | "conditionally_available"
  | "confirmation_required"
  | "unavailable"
  | "suspended"
  | "archived";

export type HousingInventorySource = "firestore" | "bootstrap" | "unavailable";

export type HousingInventoryItem = {
  id: string;
  internalReference: string;
  partner: {
    id?: string;
    displayName: string;
    operatorName?: string;
  };
  residenceName: string;
  countryCode: "FR";
  countryName: "France";
  cityCode: string;
  cityLabel: string;
  zoneLabel?: string;
  municipality: string;
  postalCode: string;
  address: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: "France";
    formattedAddress: string;
  };
  publicAddress?: {
    formattedAddress: string;
    displayToClient: boolean;
    validatedAt?: string;
    validatedByAdminUid?: string;
  };
  accommodationTypes: HousingAccommodationType[];
  pricing: {
    currency: "EUR";
    cityIndicativePrice?: number;
    residenceDisplayedRent?: number;
    monthlyRentForCertificate?: number;
    serviceFee?: number;
    priceValidationStatus: "unverified" | "verified" | "requires_admin_review";
  };
  inventoryStatus: HousingInventoryStatus;
  availabilityGuaranteed: false;
  autoIssuance: {
    enabled: boolean;
    eligibilityStatus: "eligible" | "manual_review_only" | "suspended" | "expired";
    validUntil?: string;
    approvedByAdminUid?: string;
    approvedAt?: string;
    conditionalCapacity?: number;
    remainingConditionalCapacity?: number;
    arrivalDateFrom?: string;
    arrivalDateUntil?: string;
    manualReviewRequired?: boolean;
    stopReason?: string;
  };
  availability: {
    lastConfirmedAt?: string;
    confirmedBy?: string;
    confirmationReference?: string;
  };
  isVisibleToClients: boolean;
  isEligibleForCertificate: boolean;
  source: {
    officialUrl?: string;
    lastCheckedAt?: string;
    workbookName?: string;
    sheetName?: string;
    sourceRow?: number;
    importBatchId?: string;
  };
  publicDescription?: string;
  internalNotes?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type HousingAutoIssuanceReason =
  | "ELIGIBLE"
  | "RESIDENCE_NOT_ELIGIBLE"
  | "VALIDATION_EXPIRED"
  | "PRICE_NOT_VERIFIED"
  | "CAPACITY_EXHAUSTED"
  | "ARRIVAL_DATE_OUT_OF_RANGE"
  | "REQUEST_INCOMPLETE"
  | "PAYMENT_NOT_CONFIRMED"
  | "DUPLICATE_OR_FRAUD_RISK"
  | "MANUAL_REVIEW_FORCED"
  | "GLOBAL_KILL_SWITCH_DISABLED";

export type HousingSelectionSnapshot = {
  selectedAt: string;
  inventorySource: Exclude<HousingInventorySource, "unavailable">;
  manualReviewRequired: boolean;
  housingInventoryId: string;
  inventoryVersion: number;
  internalReference: string;
  partnerName: string;
  residenceName: string;
  cityCode: string;
  cityLabel: string;
  municipality: string;
  address: HousingInventoryItem["address"];
  accommodationTypes: HousingAccommodationType[];
  selectedAccommodationType: HousingAccommodationType;
  pricing: HousingInventoryItem["pricing"];
};

export type HousingPaymentSnapshot = {
  capturedAt: string;
  paymentId: string;
  serviceType: "accommodation_certificate";
  amount: number;
  currency: "eur";
};

export type HousingAutoDecisionSnapshot = {
  evaluatedAt: string;
  policyVersion: string;
  eligible: boolean;
  reasons: HousingAutoIssuanceReason[];
  housingInventoryVersion?: number;
  paymentVerified: boolean;
  requestComplete: boolean;
  residenceEligible: boolean;
  priceVerified: boolean;
  validityCurrent: boolean;
  capacityAvailable?: boolean;
  fraudOrDuplicateFlag: boolean;
};

export type HousingAdminApprovalSnapshot = {
  approvedAt: string;
  approvedBy: string;
  approvedByRole: "admin" | "super_admin";
  reason: string;
  confirmationReference: string;
};

export type HousingCertificateSnapshot = {
  createdAt: string;
  source: "automatic_policy" | "admin_approval";
  requestId: string;
  ownerId: string;
  caseId: string;
  paymentId: string;
  student: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    placeOfBirth: string;
    nationality: string;
    originCountry: string;
    expectedArrivalDate: string;
    expectedStayDurationMonths: number;
    academicYear: string;
    schoolName: string;
  };
  housing: HousingAllocation;
  inventoryVersion: number;
  policyVersion?: string;
};

export type HousingAllocation = {
  inventoryReference: string;
  partnerName: string;
  residenceName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  accommodationType: HousingAccommodationType;
  monthlyRent: number;
  currency: "EUR";
  confirmedAt: string;
  confirmationReference: string;
  validUntil: string;
  allocationReason: string;
  allocationVersion: number;
  approvedBy: string;
  approvedAt: string;
};

export type HousingRequest = {
  id: string;
  ownerId: string;
  caseId: string;
  clientEmail: string;
  clientName: string;
  serviceType: "conditional_housing_certificate";
  status: HousingRequestStatus;
  studentFirstName: string;
  studentLastName: string;
  studentFullName: string;
  studentPhone: string;
  studentDateOfBirth: string;
  studentPlaceOfBirth: string;
  nationality: string;
  nationalityReference?: NationalityReference;
  originCountry: string;
  originCountryReference?: CountryReference;
  currentResidenceCountry: string;
  currentResidenceCountryReference?: CountryReference;
  destinationCountry: "France";
  destinationCountryReference?: CountryReference;
  housingInventoryId: string | null;
  preferredCityCode: string;
  preferredCity: string;
  schoolName: string;
  schoolCity: string;
  academicYear: string;
  expectedArrivalDate: string;
  expectedStayDurationMonths: number;
  accommodationType: HousingAccommodationType;
  indicativeMonthlyRent: number;
  currency: "EUR";
  specialNeeds: string | null;
  notes: string | null;
  consentAccuracy: true;
  consentConditionalNature: true;
  consentTerms: true;
  consentDataProcessing: true;
  consentAddressAdjustment: true;
  paymentId: string | null;
  allocation: HousingAllocation | null;
  selectionSnapshot: HousingSelectionSnapshot | null;
  paymentSnapshot: HousingPaymentSnapshot | null;
  autoDecisionSnapshot: HousingAutoDecisionSnapshot | null;
  adminApprovalSnapshot: HousingAdminApprovalSnapshot | null;
  certificateSnapshot: HousingCertificateSnapshot | null;
  duplicateOrFraudRisk: boolean;
  generationJobId: string | null;
  generatedDocumentId: string | null;
  schemaVersion: 2;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type DocumentGenerationJobStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "retryable"
  | "dead_letter"
  | "cancelled";

export type HousingDocumentGenerationJob = {
  id: string;
  serviceType: "conditional_housing_certificate";
  documentType: "accommodation_certificate";
  clientUid: string;
  caseId: string;
  housingRequestId: string;
  paymentId: string;
  stripeEventId: string;
  status: DocumentGenerationJobStatus;
  attemptCount: number;
  maxAttempts: number;
  templateVersion: string;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessageSanitized: string | null;
  generatedDocumentId: string | null;
  createdBy: "stripe_webhook" | "admin";
  idempotencyKey: string;
};
