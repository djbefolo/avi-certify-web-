import type {
  CountryReference,
  NationalityReference,
} from "@/lib/profile/country-reference";

export type SelectedStudentService =
  | "attestation_hebergement"
  | "avi"
  | "paiement_scolarite"
  | "accompagnement_visa"
  | "coaching_mobilite";

export type AdmissionStatus =
  | "not_started"
  | "in_progress"
  | "admitted"
  | "refused";

export type AdmissionDocumentStatus =
  | "not_provided"
  | "pending"
  | "provided"
  | "validated";

export type FinancialNeedType =
  | "avi"
  | "school_fees"
  | "housing"
  | "visa_support"
  | "not_sure";

export type HousingNeed = "yes" | "no" | "not_sure";

export type BinaryChoice = "yes" | "no" | "not_sure";

export type StudentProfile = {
  uid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  birthDate: string | null;
  birthCountry: string | null;
  originCountry?: string | null;
  originCountryReference?: CountryReference | null;
  phoneWhatsApp: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  nationalityReference?: NationalityReference | null;
  countryOfResidence: string | null;
  countryOfResidenceReference?: CountryReference | null;
  destinationCountry: string | null;
  destinationCountryReference?: CountryReference | null;
  destinationCity: string | null;
  targetSchoolName: string | null;
  admissionStatus: AdmissionStatus | null;
  admissionDocumentStatus: AdmissionDocumentStatus | null;
  intendedProgram: string | null;
  intendedAcademicYear: string | null;
  intendedArrivalDate: string | null;
  expectedStayDuration: string | null;
  financialNeedType: FinancialNeedType | null;
  requestedAviAmount: number | null;
  needsFinancing: BinaryChoice | null;
  selectedService: SelectedStudentService | null;
  housingNeed: HousingNeed | null;
  preferredHousingCity: string | null;
  previousVisaRefusal: BinaryChoice | null;
  previousVisaRefusalCountry: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  role: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type EditableStudentProfile = Omit<
  StudentProfile,
  | "uid"
  | "email"
  | "role"
  | "createdAt"
  | "updatedAt"
  | "originCountry"
  | "originCountryReference"
  | "nationalityReference"
  | "countryOfResidenceReference"
  | "destinationCountryReference"
>;

export const identityProfileFields = [
  "firstName",
  "lastName",
  "birthDate",
  "birthCountry",
  "nationality",
  "countryOfResidence",
] as const satisfies readonly (keyof StudentProfile)[];

export const projectProfileFields = [
  "destinationCountry",
  "destinationCity",
  "targetSchoolName",
  "intendedProgram",
  "intendedAcademicYear",
  "intendedArrivalDate",
  "selectedService",
] as const satisfies readonly (keyof StudentProfile)[];

export const dossierProfileFields = [
  "requestedAviAmount",
  "housingNeed",
  "needsFinancing",
  "admissionStatus",
  "previousVisaRefusal",
] as const satisfies readonly (keyof StudentProfile)[];

export const coreProfileFields = [
  ...identityProfileFields,
  ...projectProfileFields,
] as const satisfies readonly (keyof StudentProfile)[];

export const housingCertificateRequiredFields = [
  "fullName",
  "dateOfBirth",
  "placeOfBirth",
  "nationality",
  "intendedArrivalDate",
  "expectedStayDuration",
] as const satisfies readonly (keyof StudentProfile)[];

export type CoreProfileField = (typeof coreProfileFields)[number];
export type HousingCertificateRequiredField =
  (typeof housingCertificateRequiredFields)[number];
