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

export type StudentProfile = {
  uid: string;
  email: string | null;
  fullName: string | null;
  phoneWhatsApp: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  destinationCountry: string | null;
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
  selectedService: SelectedStudentService | null;
  housingNeed: HousingNeed | null;
  preferredHousingCity: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  role: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type EditableStudentProfile = Omit<
  StudentProfile,
  "uid" | "email" | "role" | "createdAt" | "updatedAt"
>;

export const coreProfileFields = [
  "fullName",
  "dateOfBirth",
  "placeOfBirth",
  "nationality",
  "countryOfResidence",
  "destinationCountry",
  "targetSchoolName",
  "intendedArrivalDate",
  "expectedStayDuration",
  "selectedService",
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
