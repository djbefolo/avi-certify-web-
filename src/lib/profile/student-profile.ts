import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  AdmissionDocumentStatus,
  AdmissionStatus,
  EditableStudentProfile,
  FinancialNeedType,
  HousingNeed,
  SelectedStudentService,
  StudentProfile,
} from "@/types/student-profile";
import {
  coreProfileFields,
  housingCertificateRequiredFields,
  type CoreProfileField,
  type HousingCertificateRequiredField,
} from "@/types/student-profile";

const USERS_COLLECTION = "users";

export const selectedServiceOptions: {
  value: SelectedStudentService;
  label: string;
}[] = [
  { value: "attestation_hebergement", label: "Attestation d’hébergement" },
  {
    value: "avi",
    label: "Attestation de Virement Irrévocable — AVI",
  },
  {
    value: "paiement_scolarite",
    label: "Paiement des frais de scolarité / admission",
  },
  { value: "accompagnement_visa", label: "Accompagnement visa" },
  { value: "coaching_mobilite", label: "Coaching mobilité" },
];

export const admissionStatusOptions: { value: AdmissionStatus; label: string }[] = [
  { value: "not_started", label: "Non démarré" },
  { value: "in_progress", label: "En cours" },
  { value: "admitted", label: "Admission obtenue" },
  { value: "refused", label: "Refusé" },
];

export const admissionDocumentStatusOptions: {
  value: AdmissionDocumentStatus;
  label: string;
}[] = [
  { value: "not_provided", label: "Non fourni" },
  { value: "pending", label: "En attente" },
  { value: "provided", label: "Fourni" },
  { value: "validated", label: "Validé" },
];

export const financialNeedTypeOptions: {
  value: FinancialNeedType;
  label: string;
}[] = [
  { value: "avi", label: "AVI" },
  { value: "school_fees", label: "Frais de scolarité" },
  { value: "housing", label: "Hébergement" },
  { value: "visa_support", label: "Accompagnement visa" },
  { value: "not_sure", label: "À préciser" },
];

export const housingNeedOptions: { value: HousingNeed; label: string }[] = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "not_sure", label: "À confirmer" },
];

export function getSelectedServiceLabel(value: SelectedStudentService | null) {
  return (
    selectedServiceOptions.find((option) => option.value === value)?.label ??
    "Non renseigné"
  );
}

export function createEmptyEditableProfile(): EditableStudentProfile {
  return {
    fullName: null,
    phoneWhatsApp: null,
    dateOfBirth: null,
    placeOfBirth: null,
    nationality: null,
    countryOfResidence: null,
    destinationCountry: null,
    destinationCity: null,
    targetSchoolName: null,
    admissionStatus: null,
    admissionDocumentStatus: null,
    intendedProgram: null,
    intendedAcademicYear: null,
    intendedArrivalDate: null,
    expectedStayDuration: null,
    financialNeedType: null,
    requestedAviAmount: null,
    selectedService: null,
    housingNeed: null,
    preferredHousingCity: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
  };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

function getStringField(data: DocumentData, field: string): string | null {
  const value = data[field];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getNumberField(data: DocumentData, field: string): number | null {
  const value = data[field];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getOptionValue<T extends string>(
  data: DocumentData,
  field: string,
  allowedValues: readonly T[],
): T | null {
  const value = getStringField(data, field);

  return value && allowedValues.includes(value as T) ? (value as T) : null;
}

export function mapStudentProfile(uid: string, data: DocumentData): StudentProfile {
  return {
    uid: String(data.uid ?? uid),
    email: getStringField(data, "email"),
    fullName: getStringField(data, "fullName"),
    phoneWhatsApp:
      getStringField(data, "phoneWhatsApp") ?? getStringField(data, "phone"),
    dateOfBirth: getStringField(data, "dateOfBirth"),
    placeOfBirth:
      getStringField(data, "placeOfBirth") ?? getStringField(data, "birthPlace"),
    nationality: getStringField(data, "nationality"),
    countryOfResidence:
      getStringField(data, "countryOfResidence") ??
      getStringField(data, "residenceCountry"),
    destinationCountry: getStringField(data, "destinationCountry"),
    destinationCity: getStringField(data, "destinationCity"),
    targetSchoolName: getStringField(data, "targetSchoolName"),
    admissionStatus: getOptionValue(
      data,
      "admissionStatus",
      admissionStatusOptions.map((option) => option.value),
    ),
    admissionDocumentStatus: getOptionValue(
      data,
      "admissionDocumentStatus",
      admissionDocumentStatusOptions.map((option) => option.value),
    ),
    intendedProgram: getStringField(data, "intendedProgram"),
    intendedAcademicYear: getStringField(data, "intendedAcademicYear"),
    intendedArrivalDate: getStringField(data, "intendedArrivalDate"),
    expectedStayDuration: getStringField(data, "expectedStayDuration"),
    financialNeedType: getOptionValue(
      data,
      "financialNeedType",
      financialNeedTypeOptions.map((option) => option.value),
    ),
    requestedAviAmount: getNumberField(data, "requestedAviAmount"),
    selectedService: getOptionValue(
      data,
      "selectedService",
      selectedServiceOptions.map((option) => option.value),
    ),
    housingNeed: getOptionValue(
      data,
      "housingNeed",
      housingNeedOptions.map((option) => option.value),
    ),
    preferredHousingCity: getStringField(data, "preferredHousingCity"),
    emergencyContactName: getStringField(data, "emergencyContactName"),
    emergencyContactPhone: getStringField(data, "emergencyContactPhone"),
    role: getStringField(data, "role"),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getStudentProfile(uid: string): Promise<StudentProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, uid));

  if (!snapshot.exists()) {
    return null;
  }

  return mapStudentProfile(uid, snapshot.data());
}

function cleanString(value: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export async function updateStudentProfile(
  uid: string,
  profile: EditableStudentProfile,
) {
  await updateDoc(doc(getFirebaseDb(), USERS_COLLECTION, uid), {
    fullName: cleanString(profile.fullName),
    phoneWhatsApp: cleanString(profile.phoneWhatsApp),
    dateOfBirth: cleanString(profile.dateOfBirth),
    placeOfBirth: cleanString(profile.placeOfBirth),
    nationality: cleanString(profile.nationality),
    countryOfResidence: cleanString(profile.countryOfResidence),
    destinationCountry: cleanString(profile.destinationCountry),
    destinationCity: cleanString(profile.destinationCity),
    targetSchoolName: cleanString(profile.targetSchoolName),
    admissionStatus: profile.admissionStatus,
    admissionDocumentStatus: profile.admissionDocumentStatus,
    intendedProgram: cleanString(profile.intendedProgram),
    intendedAcademicYear: cleanString(profile.intendedAcademicYear),
    intendedArrivalDate: cleanString(profile.intendedArrivalDate),
    expectedStayDuration: cleanString(profile.expectedStayDuration),
    financialNeedType: profile.financialNeedType,
    requestedAviAmount: profile.requestedAviAmount,
    selectedService: profile.selectedService,
    housingNeed: profile.housingNeed,
    preferredHousingCity: cleanString(profile.preferredHousingCity),
    emergencyContactName: cleanString(profile.emergencyContactName),
    emergencyContactPhone: cleanString(profile.emergencyContactPhone),
    updatedAt: serverTimestamp(),
  });
}

function hasProfileValue(value: StudentProfile[keyof StudentProfile]) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

export function getProfileCompletion(profile: StudentProfile | null) {
  if (!profile) {
    return {
      percent: 0,
      state: "incomplete" as const,
      missingFields: [...coreProfileFields],
    };
  }

  const missingFields = coreProfileFields.filter(
    (field) => !hasProfileValue(profile[field]),
  );
  const completedFields = coreProfileFields.length - missingFields.length;
  const percent = Math.round((completedFields / coreProfileFields.length) * 100);

  return {
    percent,
    state:
      percent === 100 ? ("complete" as const) : percent > 0 ? ("partial" as const) : ("incomplete" as const),
    missingFields,
  };
}

export function getHousingCertificateProfileValidation(
  profile: StudentProfile | null,
) {
  const missingFields: HousingCertificateRequiredField[] = profile
    ? housingCertificateRequiredFields.filter(
        (field) => !hasProfileValue(profile[field]),
      )
    : [...housingCertificateRequiredFields];
  const hasHousingCity = Boolean(
    profile?.preferredHousingCity?.trim() || profile?.destinationCity?.trim(),
  );

  if (!hasHousingCity) {
    missingFields.push("preferredHousingCity" as HousingCertificateRequiredField);
  }

  return {
    complete: missingFields.length === 0,
    missingFields,
  };
}

export const profileFieldLabels: Record<
  CoreProfileField | HousingCertificateRequiredField | "preferredHousingCity",
  string
> = {
  fullName: "Nom complet",
  dateOfBirth: "Date de naissance",
  placeOfBirth: "Lieu de naissance",
  nationality: "Nationalité",
  countryOfResidence: "Pays de résidence",
  destinationCountry: "Pays de destination",
  targetSchoolName: "École / établissement visé",
  intendedArrivalDate: "Date prévue d’arrivée",
  expectedStayDuration: "Durée estimée du séjour",
  selectedService: "Service choisi",
  preferredHousingCity: "Ville souhaitée pour l’hébergement",
};
