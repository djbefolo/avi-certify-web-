import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  AdmissionDocumentStatus,
  AdmissionStatus,
  BinaryChoice,
  EditableStudentProfile,
  FinancialNeedType,
  HousingNeed,
  SelectedStudentService,
  StudentProfile,
} from "@/types/student-profile";
import {
  coreProfileFields,
  dossierProfileFields,
  housingCertificateRequiredFields,
  identityProfileFields,
  projectProfileFields,
  type CoreProfileField,
  type HousingCertificateRequiredField,
} from "@/types/student-profile";

const USERS_COLLECTION = "users";

export const selectedServiceOptions: {
  value: SelectedStudentService;
  label: string;
}[] = [
  { value: "attestation_hebergement", label: "Attestation d'hébergement" },
  {
    value: "avi",
    label: "Attestation de Virement Irrévocable - AVI",
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

export const binaryChoiceOptions: { value: BinaryChoice; label: string }[] = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "not_sure", label: "À confirmer" },
];

export function getSelectedServiceLabel(value: SelectedStudentService | null) {
  return (
    selectedServiceOptions.find((option) => option.value === value)?.label ??
    "A renseigner"
  );
}

export function createEmptyEditableProfile(): EditableStudentProfile {
  return {
    firstName: null,
    lastName: null,
    fullName: null,
    birthDate: null,
    birthCountry: null,
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
    needsFinancing: null,
    selectedService: null,
    housingNeed: null,
    preferredHousingCity: null,
    previousVisaRefusal: null,
    previousVisaRefusalCountry: null,
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

function getFullName(data: DocumentData) {
  const fullName = getStringField(data, "fullName");

  if (fullName) {
    return fullName;
  }

  const firstName = getStringField(data, "firstName");
  const lastName = getStringField(data, "lastName");
  const derived = [firstName, lastName].filter(Boolean).join(" ").trim();

  return derived || null;
}

export function mapStudentProfile(uid: string, data: DocumentData): StudentProfile {
  const birthDate =
    getStringField(data, "birthDate") ?? getStringField(data, "dateOfBirth");
  const dateOfBirth =
    getStringField(data, "dateOfBirth") ?? getStringField(data, "birthDate");

  return {
    uid: String(data.uid ?? uid),
    email: getStringField(data, "email"),
    firstName: getStringField(data, "firstName"),
    lastName: getStringField(data, "lastName"),
    fullName: getFullName(data),
    birthDate,
    birthCountry: getStringField(data, "birthCountry"),
    phoneWhatsApp:
      getStringField(data, "phoneWhatsApp") ?? getStringField(data, "phone"),
    dateOfBirth,
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
    needsFinancing: getOptionValue(
      data,
      "needsFinancing",
      binaryChoiceOptions.map((option) => option.value),
    ),
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
    previousVisaRefusal: getOptionValue(
      data,
      "previousVisaRefusal",
      binaryChoiceOptions.map((option) => option.value),
    ),
    previousVisaRefusalCountry: getStringField(data, "previousVisaRefusalCountry"),
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
  account?: { email?: string | null },
) {
  const firstName = cleanString(profile.firstName);
  const lastName = cleanString(profile.lastName);
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    cleanString(profile.fullName);
  const birthDate = cleanString(profile.birthDate ?? profile.dateOfBirth);
  const timestamp = serverTimestamp();
  const userRef = doc(getFirebaseDb(), USERS_COLLECTION, uid);
  const existingProfile = await getDoc(userRef);
  const profileFields = {
    firstName,
    lastName,
    fullName,
    birthDate,
    birthCountry: cleanString(profile.birthCountry),
    phoneWhatsApp: cleanString(profile.phoneWhatsApp),
    dateOfBirth: birthDate,
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
    needsFinancing: profile.needsFinancing,
    selectedService: profile.selectedService,
    housingNeed: profile.housingNeed,
    preferredHousingCity: cleanString(profile.preferredHousingCity),
    previousVisaRefusal: profile.previousVisaRefusal,
    previousVisaRefusalCountry: cleanString(profile.previousVisaRefusalCountry),
    emergencyContactName: cleanString(profile.emergencyContactName),
    emergencyContactPhone: cleanString(profile.emergencyContactPhone),
    updatedAt: timestamp,
    profileUpdatedAt: timestamp,
  };

  if (existingProfile.exists()) {
    await setDoc(userRef, profileFields, { merge: true });
    return;
  }

  await setDoc(
    userRef,
    {
      uid,
      email: cleanString(account?.email ?? null)?.toLowerCase() ?? null,
      role: "student",
      status: "active",
      createdAt: timestamp,
      ...profileFields,
    },
    { merge: true },
  );
}

function hasProfileValue(value: StudentProfile[keyof StudentProfile]) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function buildCompletionSection<T extends readonly (keyof StudentProfile)[]>(
  label: string,
  fields: T,
  profile: StudentProfile | null,
) {
  const missingFields = profile
    ? fields.filter((field) => !hasProfileValue(profile[field]))
    : [...fields];
  const completedFields = fields.length - missingFields.length;
  const percent = Math.round((completedFields / fields.length) * 100);

  return {
    label,
    percent,
    missingFields,
  };
}

export function getProfileCompletion(profile: StudentProfile | null) {
  const sections = [
    buildCompletionSection("Identité", identityProfileFields, profile),
    buildCompletionSection("Projet étudiant", projectProfileFields, profile),
    buildCompletionSection("Dossier / finance", dossierProfileFields, profile),
  ];

  if (!profile) {
    return {
      percent: 0,
      state: "incomplete" as const,
      missingFields: [...coreProfileFields],
      sections,
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
      percent === 100
        ? ("complete" as const)
        : percent > 0
          ? ("partial" as const)
          : ("incomplete" as const),
    missingFields,
    sections,
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
  | CoreProfileField
  | HousingCertificateRequiredField
  | "birthCountry"
  | "destinationCity"
  | "intendedProgram"
  | "intendedAcademicYear"
  | "requestedAviAmount"
  | "housingNeed"
  | "needsFinancing"
  | "admissionStatus"
  | "previousVisaRefusal"
  | "previousVisaRefusalCountry"
  | "preferredHousingCity",
  string
> = {
  firstName: "Prénom",
  lastName: "Nom",
  fullName: "Nom complet",
  birthDate: "Date de naissance",
  birthCountry: "Pays de naissance",
  dateOfBirth: "Date de naissance",
  placeOfBirth: "Lieu de naissance",
  nationality: "Nationalité",
  countryOfResidence: "Pays de résidence",
  destinationCountry: "Pays de destination",
  destinationCity: "Ville de destination",
  targetSchoolName: "École / établissement visé",
  intendedProgram: "Programme / formation",
  intendedAcademicYear: "Rentrée prévue",
  intendedArrivalDate: "Date prévue d'arrivée",
  expectedStayDuration: "Durée estimée du séjour",
  selectedService: "Service choisi",
  requestedAviAmount: "Montant AVI estimé",
  housingNeed: "Besoin logement",
  needsFinancing: "Besoin financement",
  admissionStatus: "Statut d'admission",
  previousVisaRefusal: "Historique refus visa",
  previousVisaRefusalCountry: "Pays du refus visa",
  preferredHousingCity: "Ville souhaitée pour l'hébergement",
};
