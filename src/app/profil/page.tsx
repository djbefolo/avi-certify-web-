"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { birthCountryOptions } from "@/lib/profile/countries";
import {
  admissionDocumentStatusOptions,
  admissionStatusOptions,
  binaryChoiceOptions,
  createEmptyEditableProfile,
  financialNeedTypeOptions,
  getProfileCompletion,
  getStudentProfile,
  housingNeedOptions,
  profileFieldLabels,
  selectedServiceOptions,
  updateStudentProfile,
} from "@/lib/profile/student-profile";
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

type FieldConfig = {
  name: keyof EditableStudentProfile;
  label: string;
  type?: "text" | "date" | "email" | "tel" | "number";
  placeholder?: string;
};

type SelectConfig<T extends string> = {
  name: keyof EditableStudentProfile;
  label: string;
  options: { value: T; label: string }[];
};

const identityFields: FieldConfig[] = [
  { name: "firstName", label: "Prénom", placeholder: "Ex. Jean" },
  { name: "lastName", label: "Nom", placeholder: "Ex. Dreyfus" },
  { name: "birthDate", label: "Date de naissance", type: "date" },
  { name: "phoneWhatsApp", label: "Téléphone WhatsApp", type: "tel" },
  { name: "placeOfBirth", label: "Lieu de naissance" },
  { name: "nationality", label: "Nationalité" },
  { name: "countryOfResidence", label: "Pays de résidence" },
];

const studyFields: FieldConfig[] = [
  { name: "destinationCountry", label: "Destination souhaitée" },
  { name: "destinationCity", label: "Ville de destination" },
  { name: "targetSchoolName", label: "École / université" },
  { name: "intendedProgram", label: "Programme / formation" },
  { name: "intendedAcademicYear", label: "Rentrée prévue" },
  { name: "intendedArrivalDate", label: "Date prévue d'arrivée", type: "date" },
  {
    name: "expectedStayDuration",
    label: "Durée estimée du séjour",
    placeholder: "Ex. 12 mois",
  },
];

const serviceFields: FieldConfig[] = [
  {
    name: "requestedAviAmount",
    label: "Montant AVI estimé",
    type: "number",
    placeholder: "Ex. 7380",
  },
  {
    name: "preferredHousingCity",
    label: "Ville souhaitée pour l'hébergement",
  },
];

const dossierFields: FieldConfig[] = [
  { name: "previousVisaRefusalCountry", label: "Pays du refus visa" },
];

const contactFields: FieldConfig[] = [
  { name: "emergencyContactName", label: "Contact d'urgence" },
  {
    name: "emergencyContactPhone",
    label: "Téléphone du contact d'urgence",
    type: "tel",
  },
];

function getDateLabel(date: Date | null) {
  if (!date) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function toEditableProfile(profile: StudentProfile | null): EditableStudentProfile {
  const emptyProfile = createEmptyEditableProfile();

  if (!profile) {
    return emptyProfile;
  }

  return {
    ...emptyProfile,
    firstName: profile.firstName,
    lastName: profile.lastName,
    fullName: profile.fullName,
    birthDate: profile.birthDate,
    birthCountry: profile.birthCountry,
    phoneWhatsApp: profile.phoneWhatsApp,
    dateOfBirth: profile.dateOfBirth,
    placeOfBirth: profile.placeOfBirth,
    nationality: profile.nationality,
    countryOfResidence: profile.countryOfResidence,
    destinationCountry: profile.destinationCountry,
    destinationCity: profile.destinationCity,
    targetSchoolName: profile.targetSchoolName,
    admissionStatus: profile.admissionStatus,
    admissionDocumentStatus: profile.admissionDocumentStatus,
    intendedProgram: profile.intendedProgram,
    intendedAcademicYear: profile.intendedAcademicYear,
    intendedArrivalDate: profile.intendedArrivalDate,
    expectedStayDuration: profile.expectedStayDuration,
    financialNeedType: profile.financialNeedType,
    requestedAviAmount: profile.requestedAviAmount,
    needsFinancing: profile.needsFinancing,
    selectedService: profile.selectedService,
    housingNeed: profile.housingNeed,
    preferredHousingCity: profile.preferredHousingCity,
    previousVisaRefusal: profile.previousVisaRefusal,
    previousVisaRefusalCountry: profile.previousVisaRefusalCountry,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
  };
}

function FormField({
  field,
  form,
  disabled,
  onChange,
}: {
  field: FieldConfig;
  form: EditableStudentProfile;
  disabled: boolean;
  onChange: (name: keyof EditableStudentProfile, value: string | number | null) => void;
}) {
  const value = form[field.name];
  const inputValue = typeof value === "number" ? value : value ?? "";

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Input
        id={field.name}
        type={field.type ?? "text"}
        value={inputValue}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(event) => {
          const nextValue =
            field.type === "number"
              ? event.target.value
                ? Number(event.target.value)
                : null
              : event.target.value;

          onChange(field.name, nextValue);
        }}
      />
    </div>
  );
}

function FormSelect<T extends string>({
  field,
  form,
  disabled,
  onChange,
}: {
  field: SelectConfig<T>;
  form: EditableStudentProfile;
  disabled: boolean;
  onChange: (name: keyof EditableStudentProfile, value: T | null) => void;
}) {
  const value = form[field.name];

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>{field.label}</Label>
      <Select
        id={field.name}
        value={typeof value === "string" ? value : ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(field.name, event.target.value ? (event.target.value as T) : null)
        }
      >
        <option value="">Sélectionner</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function ProfilPage() {
  const { user, isEmailVerified } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<EditableStudentProfile>(
    createEmptyEditableProfile,
  );
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user || !isEmailVerified) {
        setProfile(null);
        setForm(createEmptyEditableProfile());
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setErrorMessage(null);

      try {
        const nextProfile = await getStudentProfile(user.uid);

        if (!cancelled) {
          setProfile(nextProfile);
          setForm(toEditableProfile(nextProfile));
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Impossible de charger le profil pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, user]);

  const completion = useMemo(() => getProfileCompletion(profile), [profile]);
  const email = profile?.email ?? user?.email ?? "A renseigner";
  const uid = profile?.uid ?? user?.uid ?? "Non disponible";
  const canSave = Boolean(user && isEmailVerified && profile);

  const updateField = (
    name: keyof EditableStudentProfile,
    value: string | number | null,
  ) => {
    setForm((current) => ({ ...current, [name]: value }));
    setSuccessMessage(null);
  };

  const saveProfile = async () => {
    if (!user || !canSave) {
      setErrorMessage("Le profil doit exister avant de pouvoir être mis à jour.");
      return;
    }

    setSavingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateStudentProfile(user.uid, form);
      const nextProfile = await getStudentProfile(user.uid);

      setProfile(nextProfile);
      setForm(toEditableProfile(nextProfile));
      setSuccessMessage("Profil mis à jour avec succès.");
    } catch {
      setErrorMessage("Impossible d'enregistrer le profil pour le moment.");
    } finally {
      setSavingProfile(false);
    }
  };

  const disabled = loadingProfile || savingProfile || !canSave;

  return (
    <DashboardLayout
      title="Profil étudiant"
      description="Complétez progressivement les informations utilisées pour votre dossier, vos documents et votre accompagnement."
    >
      <div className="grid gap-5">
        <section className="rounded-md border bg-background p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                <UserRound className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">
                Dossier étudiant progressif
              </h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Ces données restent rattachées à votre compte sécurisé et servent
                à préparer votre parcours AVI CERTIFY.
              </p>
            </div>
            <div className="min-w-56 rounded-md border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Profil complété à
              </p>
              <p className="mt-2 text-3xl font-semibold">{completion.percent} %</p>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {completion.state === "complete"
                  ? "Profil complet"
                  : "Complétude progressive"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {completion.sections.map((section) => (
              <div key={section.label} className="rounded-md border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-medium text-muted-foreground">{section.label}</p>
                  <p className="font-semibold">{section.percent} %</p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${section.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email
              </p>
              <p className="mt-2 break-all font-semibold">{email}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Identifiant Firebase
              </p>
              <p className="mt-2 break-all font-semibold">{uid}</p>
            </div>
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Créé le
              </p>
              <p className="mt-2 font-semibold">
                {getDateLabel(profile?.createdAt ?? null)}
              </p>
            </div>
          </div>

          {completion.missingFields.length > 0 ? (
            <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
              <p className="font-semibold">Informations à compléter</p>
              <p className="mt-2 leading-6">
                {completion.missingFields
                  .map((field) => profileFieldLabels[field])
                  .join(", ")}
              </p>
            </div>
          ) : null}
        </section>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
            <CheckCircle2 className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {successMessage}
          </p>
        ) : null}
        {loadingProfile ? (
          <p className="rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement du profil...
          </p>
        ) : null}

        <FormSection
          title="Identité"
          description="Les informations de base permettent d'identifier proprement votre dossier."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {identityFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                disabled={disabled}
                onChange={updateField}
              />
            ))}
            <FormSelect<string>
              field={{
                name: "birthCountry",
                label: "Pays de naissance",
                options: birthCountryOptions.map((country) => ({
                  value: country,
                  label: country,
                })),
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
          </div>
        </FormSection>

        <FormSection
          title="Mobilité / projet"
          description="Décrivez votre destination et votre projet académique sans devoir tout finaliser immédiatement."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {studyFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                disabled={disabled}
                onChange={updateField}
              />
            ))}
            <FormSelect<SelectedStudentService>
              field={{
                name: "selectedService",
                label: "Service recherché",
                options: selectedServiceOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
          </div>
        </FormSection>

        <FormSection
          title="Services AVI"
          description="Ces informations orientent l'accompagnement financier, logement et mobilité."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {serviceFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                disabled={disabled}
                onChange={updateField}
              />
            ))}
            <FormSelect<FinancialNeedType>
              field={{
                name: "financialNeedType",
                label: "Type de besoin financier",
                options: financialNeedTypeOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
            <FormSelect<BinaryChoice>
              field={{
                name: "needsFinancing",
                label: "Besoin financement",
                options: binaryChoiceOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
            <FormSelect<HousingNeed>
              field={{
                name: "housingNeed",
                label: "Besoin logement",
                options: housingNeedOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
          </div>
        </FormSection>

        <FormSection
          title="Dossier"
          description="Ces éléments aident AVI CERTIFY à anticiper les points sensibles du dossier."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormSelect<AdmissionStatus>
              field={{
                name: "admissionStatus",
                label: "Admission obtenue / statut",
                options: admissionStatusOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
            <FormSelect<AdmissionDocumentStatus>
              field={{
                name: "admissionDocumentStatus",
                label: "Statut du document d'admission",
                options: admissionDocumentStatusOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
            <FormSelect<BinaryChoice>
              field={{
                name: "previousVisaRefusal",
                label: "Historique refus visa",
                options: binaryChoiceOptions,
              }}
              form={form}
              disabled={disabled}
              onChange={updateField}
            />
            {dossierFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                disabled={disabled}
                onChange={updateField}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Contact">
          <div className="grid gap-4 md:grid-cols-2">
            {contactFields.map((field) => (
              <FormField
                key={field.name}
                field={field}
                form={form}
                disabled={disabled}
                onChange={updateField}
              />
            ))}
          </div>
        </FormSection>

        <div className="flex flex-col gap-3 rounded-md border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <p>
              Les champs incomplets restent visibles dans le tableau de bord sans
              bloquer votre navigation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour au tableau de bord
              </Link>
            </Button>
            <Button
              type="button"
              disabled={disabled}
              aria-busy={savingProfile}
              onClick={() => void saveProfile()}
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Enregistrer mon profil
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
