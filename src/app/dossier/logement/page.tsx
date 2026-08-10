"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  countryOptions,
  franceCountryReference,
  nationalityOptions,
  resolveCountryReference,
  resolveNationalityReference,
  type CountryReference,
  type NationalityReference,
} from "@/lib/profile/country-reference";
import { getStudentProfile } from "@/lib/profile/student-profile";
import type { StudentProfile } from "@/types/student-profile";
import type {
  HousingAccommodationType,
  HousingInventorySource,
  HousingRequestStatus,
} from "@/types/housing";

type HousingForm = {
  studentFirstName: string;
  studentLastName: string;
  studentPhone: string;
  studentDateOfBirth: string;
  studentPlaceOfBirth: string;
  nationality: NationalityReference | null;
  originCountry: CountryReference | null;
  currentResidenceCountry: CountryReference | null;
  destinationCountry: CountryReference;
  preferredCityCode: string;
  housingInventoryId: string;
  schoolName: string;
  schoolCity: string;
  academicYear: string;
  expectedArrivalDate: string;
  expectedStayDurationMonths: number;
  accommodationType: HousingAccommodationType | "";
  specialNeeds: string;
  notes: string;
  consentAccuracy: boolean;
  consentConditionalNature: boolean;
  consentTerms: boolean;
  consentDataProcessing: boolean;
  consentAddressAdjustment: boolean;
};

type ClientHousingRequest = Omit<
  HousingForm,
  | "consentAccuracy"
  | "consentConditionalNature"
  | "consentTerms"
  | "consentDataProcessing"
  | "consentAddressAdjustment"
> & {
  id: string;
  status: HousingRequestStatus;
  preferredCity: string;
  indicativeMonthlyRent: number;
  currency: "EUR";
  documentAvailable: boolean;
  documentId: string | null;
  residenceName: string | null;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

type HousingCityOption = {
  code: string;
  label: string;
  country: "France";
  residenceCount: number;
  minimumDisplayedRent: number | null;
  currency: "EUR";
  availabilityLabel: string;
};

type HousingResidenceOption = {
  id: string;
  internalReference: string;
  cityCode: string;
  cityLabel: string;
  municipality: string;
  postalCode: string;
  residenceName: string;
  partnerName: string;
  accommodationTypes: HousingAccommodationType[];
  indicativeMonthlyRent: number | null;
  monthlyRent: number | null;
  cityIndicativePrice: number | null;
  currency: "EUR";
  availabilityStatus: string;
  availabilityLabel: string;
  processingMode: "manual_review" | "standard";
  publicDescription: string | null;
  publicAddress: {
    formattedAddress: string;
    displayToClient: true;
  } | null;
};

type Step = 1 | 2 | 3 | 4;
type FieldErrors = Partial<Record<keyof HousingForm | "inventory", string>>;

const SERVICE_FEE_EUR = 99;
const today = new Date().toISOString().slice(0, 10);
const countryComboboxOptions = countryOptions.map((country) => ({
  value: country.codeAlpha2,
  label: country.label,
  description: `${country.codeAlpha2} · ${country.codeAlpha3}`,
  searchText: country.codeAlpha3,
}));
const nationalityComboboxOptions = nationalityOptions.map((nationality) => ({
  value: nationality.countryCodeAlpha2,
  label: nationality.label,
  description: `${nationality.countryCodeAlpha2} · ${nationality.countryCodeAlpha3}`,
  searchText: nationality.countryCodeAlpha3,
}));

type ProfileWithStructuredCountries = StudentProfile & {
  originCountry?: string | null;
  originCountryReference?: CountryReference | null;
  nationalityReference?: NationalityReference | null;
  countryOfResidenceReference?: CountryReference | null;
  destinationCountryReference?: CountryReference | null;
};

const initialForm: HousingForm = {
  studentFirstName: "",
  studentLastName: "",
  studentPhone: "",
  studentDateOfBirth: "",
  studentPlaceOfBirth: "",
  nationality: null,
  originCountry: null,
  currentResidenceCountry: null,
  destinationCountry: franceCountryReference,
  preferredCityCode: "",
  housingInventoryId: "",
  schoolName: "",
  schoolCity: "",
  academicYear: "2026-2027",
  expectedArrivalDate: "",
  expectedStayDurationMonths: 12,
  accommodationType: "",
  specialNeeds: "",
  notes: "",
  consentAccuracy: false,
  consentConditionalNature: false,
  consentTerms: false,
  consentDataProcessing: false,
  consentAddressAdjustment: false,
};

const steps: Array<{
  id: Step;
  label: string;
  shortLabel: string;
  icon: typeof UserRound;
}> = [
  { id: 1, label: "Vos informations", shortLabel: "Informations", icon: UserRound },
  { id: 2, label: "Votre projet d'études", shortLabel: "Projet", icon: GraduationCap },
  { id: 3, label: "Choisissez votre logement", shortLabel: "Logement", icon: Building2 },
  { id: 4, label: "Vérifiez votre demande", shortLabel: "Vérification", icon: ClipboardCheck },
];

const statusLabels: Record<HousingRequestStatus, string> = {
  draft: "Formulaire à compléter",
  awaiting_payment: "En attente de paiement",
  payment_pending: "Paiement en cours",
  payment_confirmed: "Paiement confirmé",
  auto_validation_pending: "Validation en cours",
  auto_approved_generation_queued: "Attestation en préparation",
  requires_admin_review: "Vérification administrative en cours",
  admin_review_in_progress: "Vérification administrative en cours",
  admin_approved_generation_queued: "Attestation approuvée et en préparation",
  generation_processing: "Document en génération",
  allocation_pending: "Confirmation partenaire en cours",
  conditionally_reserved: "Solution conditionnelle confirmée",
  certificate_generation_pending: "Document en génération",
  certificate_generated: "Document disponible",
  certificate_delivered: "Document disponible et notification envoyée",
  replaced: "Document remplacé",
  revoked: "Document révoqué",
  expired: "Document expiré",
  failed: "Intervention AVI CERTIFY requise",
};

const accommodationLabels: Record<HousingAccommodationType, string> = {
  studio: "Studio",
  t1_bis: "T1 bis",
  t2: "T2",
  shared: "Colocation",
  other: "Autre",
};

function requestHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

function readApiError(code?: string) {
  const messages: Record<string, string> = {
    HOUSING_INVENTORY_UNAVAILABLE:
      "Le catalogue de logements est momentanément indisponible. Réessayez dans quelques instants.",
    HOUSING_INVENTORY_NOT_SELECTABLE:
      "Cette résidence n'est plus sélectionnable. Choisissez une autre résidence.",
    HOUSING_INVENTORY_CITY_MISMATCH:
      "La résidence ne correspond pas à la ville sélectionnée.",
    HOUSING_ACCOMMODATION_TYPE_NOT_AVAILABLE:
      "Ce type de logement n'est plus disponible pour cette résidence.",
    EMAIL_NOT_VERIFIED: "Votre adresse e-mail doit être vérifiée avant de continuer.",
    UNAUTHORIZED: "Votre session a expiré. Reconnectez-vous pour continuer.",
  };
  return messages[code ?? ""] ?? code ?? "L'opération n'a pas pu être terminée.";
}

export default function HousingRequestPage() {
  const { user, isEmailVerified } = useAuth();
  const [form, setForm] = useState<HousingForm>(initialForm);
  const [housingRequest, setHousingRequest] = useState<ClientHousingRequest | null>(null);
  const [cities, setCities] = useState<HousingCityOption[]>([]);
  const [residences, setResidences] = useState<HousingResidenceOption[]>([]);
  const [inventorySource, setInventorySource] =
    useState<HousingInventorySource>("unavailable");
  const [step, setStep] = useState<Step>(1);
  const [maxStep, setMaxStep] = useState<Step>(1);
  const [profileLoading, setProfileLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [residencesLoading, setResidencesLoading] = useState(false);
  const [residenceReloadKey, setResidenceReloadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);

  const selectedCity = useMemo(
    () => cities.find((item) => item.code === form.preferredCityCode) ?? null,
    [cities, form.preferredCityCode],
  );
  const selectedResidence = useMemo(
    () => residences.find((item) => item.id === form.housingInventoryId) ?? null,
    [form.housingInventoryId, residences],
  );
  const cityComboboxOptions = useMemo(
    () =>
      cities.map((city) => ({
        value: city.code,
        label: city.label,
        description: `${city.residenceCount} résidence${city.residenceCount > 1 ? "s" : ""}${
          city.minimumDisplayedRent
            ? ` · à partir de ${city.minimumDisplayedRent} EUR/mois`
            : ""
        }`,
      })),
    [cities],
  );
  const locked = Boolean(
    housingRequest && !["draft", "awaiting_payment"].includes(housingRequest.status),
  );
  const loading = profileLoading || citiesLoading;

  useEffect(() => {
    stepTitleRef.current?.focus();
    stepTitleRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [step]);

  const loadCities = useCallback(async () => {
    if (!user || !isEmailVerified) {
      setCitiesLoading(false);
      return;
    }
    setCitiesLoading(true);
    setInventoryError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/client/housing/cities", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        source?: HousingInventorySource;
        cities?: HousingCityOption[];
        error?: string;
      };
      if (!response.ok || !payload.cities || !payload.source) {
        throw new Error(payload.error ?? "HOUSING_INVENTORY_UNAVAILABLE");
      }
      setCities(payload.cities);
      setInventorySource(payload.source);
      if (payload.cities.length === 0) {
        setInventoryError("Aucune ville n'est disponible pour le moment.");
      }
    } catch (cause) {
      setCities([]);
      setInventorySource("unavailable");
      setInventoryError(
        readApiError(cause instanceof Error ? cause.message : undefined),
      );
    } finally {
      setCitiesLoading(false);
    }
  }, [isEmailVerified, user]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfileAndRequest() {
      if (!user || !isEmailVerified) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const token = await user.getIdToken();
        const [profile, response] = await Promise.all([
          getStudentProfile(user.uid),
          fetch("/api/client/housing-request", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);
        const payload = response.ok
          ? ((await response.json()) as { request: ClientHousingRequest | null })
          : { request: null };
        if (cancelled) return;
        setHousingRequest(payload.request);
        if (payload.request) {
          setForm({
            studentFirstName: payload.request.studentFirstName,
            studentLastName: payload.request.studentLastName,
            studentPhone: payload.request.studentPhone,
            studentDateOfBirth: payload.request.studentDateOfBirth,
            studentPlaceOfBirth: payload.request.studentPlaceOfBirth,
            nationality: payload.request.nationality,
            originCountry: payload.request.originCountry,
            currentResidenceCountry: payload.request.currentResidenceCountry,
            destinationCountry:
              payload.request.destinationCountry ?? franceCountryReference,
            preferredCityCode: payload.request.preferredCityCode,
            housingInventoryId: payload.request.housingInventoryId ?? "",
            schoolName: payload.request.schoolName,
            schoolCity: payload.request.schoolCity,
            academicYear: payload.request.academicYear,
            expectedArrivalDate: payload.request.expectedArrivalDate,
            expectedStayDurationMonths: payload.request.expectedStayDurationMonths,
            accommodationType: payload.request.accommodationType,
            specialNeeds: payload.request.specialNeeds ?? "",
            notes: payload.request.notes ?? "",
            consentAccuracy: true,
            consentConditionalNature: true,
            consentTerms: true,
            consentDataProcessing: true,
            consentAddressAdjustment: true,
          });
          if (!["draft", "awaiting_payment"].includes(payload.request.status)) {
            setStep(4);
            setMaxStep(4);
          }
        } else if (profile) {
          const structuredProfile = profile as ProfileWithStructuredCountries;
          setForm((current) => ({
            ...current,
            studentFirstName: profile.firstName ?? "",
            studentLastName: profile.lastName ?? "",
            studentPhone: profile.phoneWhatsApp ?? "",
            studentDateOfBirth: profile.dateOfBirth ?? profile.birthDate ?? "",
            studentPlaceOfBirth: profile.placeOfBirth ?? "",
            nationality:
              resolveNationalityReference(structuredProfile.nationalityReference) ??
              resolveNationalityReference(profile.nationality),
            originCountry:
              resolveCountryReference(structuredProfile.originCountryReference) ??
              resolveCountryReference(structuredProfile.originCountry) ??
              resolveCountryReference(profile.birthCountry),
            currentResidenceCountry:
              resolveCountryReference(structuredProfile.countryOfResidenceReference) ??
              resolveCountryReference(profile.countryOfResidence),
            destinationCountry:
              resolveCountryReference(structuredProfile.destinationCountryReference) ??
              resolveCountryReference(profile.destinationCountry) ??
              franceCountryReference,
            schoolName: profile.targetSchoolName ?? "",
            schoolCity: profile.destinationCity ?? "",
            academicYear: profile.intendedAcademicYear ?? current.academicYear,
            expectedArrivalDate: profile.intendedArrivalDate ?? "",
            expectedStayDurationMonths:
              Number.parseInt(profile.expectedStayDuration ?? "", 10) ||
              current.expectedStayDurationMonths,
          }));
        }
      } catch {
        if (!cancelled) {
          setError("Impossible de charger votre demande de logement.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }
    void loadProfileAndRequest();
    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadResidences() {
      if (!user || !isEmailVerified || !form.preferredCityCode) {
        setResidences([]);
        setResidencesLoading(false);
        setInventoryError(null);
        return;
      }
      setResidencesLoading(true);
      setInventoryError(null);
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/client/housing/residences?cityCode=${encodeURIComponent(form.preferredCityCode)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as {
          source?: HousingInventorySource;
          residences?: HousingResidenceOption[];
          error?: string;
        };
        if (!response.ok || !payload.residences || !payload.source) {
          throw new Error(payload.error ?? "HOUSING_INVENTORY_UNAVAILABLE");
        }
        if (!cancelled) {
          setResidences(payload.residences);
          setInventorySource(payload.source);
          if (payload.residences.length === 0) {
            setInventoryError(
              "Aucune résidence n'est actuellement proposée dans cette ville.",
            );
          }
        }
      } catch (cause) {
        if (!cancelled) {
          setResidences([]);
          setInventoryError(
            readApiError(cause instanceof Error ? cause.message : undefined),
          );
        }
      } finally {
        if (!cancelled) setResidencesLoading(false);
      }
    }
    void loadResidences();
    return () => {
      cancelled = true;
    };
  }, [form.preferredCityCode, isEmailVerified, residenceReloadKey, user]);

  function update<K extends keyof HousingForm>(key: K, value: HousingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  }

  function focusFirstError() {
    window.setTimeout(() => {
      const field = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      field?.focus();
      field?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function getStepErrors(targetStep: Step): FieldErrors {
    const next: FieldErrors = {};
    const required = (key: keyof HousingForm, label: string) => {
      const value = form[key];
      if (value === null || (typeof value === "string" && !value.trim())) {
        next[key] = `${label} est requis.`;
      }
    };

    if (targetStep === 1) {
      required("studentFirstName", "Le prénom");
      required("studentLastName", "Le nom");
      required("studentPhone", "Le téléphone");
      required("studentDateOfBirth", "La date de naissance");
      required("studentPlaceOfBirth", "Le lieu de naissance");
      required("nationality", "La nationalité");
      required("originCountry", "Le pays d'origine");
      required("currentResidenceCountry", "Le pays de résidence");
      if (form.studentDateOfBirth && form.studentDateOfBirth >= today) {
        next.studentDateOfBirth = "La date de naissance doit être antérieure à aujourd'hui.";
      }
    }

    if (targetStep === 2) {
      required("schoolName", "L'établissement");
      required("schoolCity", "La ville de l'établissement");
      required("academicYear", "L'année académique");
      required("expectedArrivalDate", "La date d'arrivée");
      if (form.expectedArrivalDate && form.expectedArrivalDate < today) {
        next.expectedArrivalDate = "La date d'arrivée ne peut pas être passée.";
      }
      if (
        !Number.isInteger(form.expectedStayDurationMonths) ||
        form.expectedStayDurationMonths < 1 ||
        form.expectedStayDurationMonths > 24
      ) {
        next.expectedStayDurationMonths = "La durée doit être comprise entre 1 et 24 mois.";
      }
    }

    if (targetStep === 3) {
      required("preferredCityCode", "La ville");
      required("housingInventoryId", "La résidence");
      if (!selectedResidence && form.housingInventoryId) {
        next.housingInventoryId = "La résidence sélectionnée n'est plus disponible.";
      }
      if (
        selectedResidence &&
        (!form.accommodationType ||
          !selectedResidence.accommodationTypes.includes(form.accommodationType))
      ) {
        next.accommodationType = "Sélectionnez un type de logement proposé.";
      }
      if (inventorySource === "unavailable") {
        next.inventory = "Le catalogue doit être disponible avant de continuer.";
      }
    }

    if (targetStep === 4) {
      const consents: Array<[keyof HousingForm, string]> = [
        ["consentAccuracy", "Confirmez l'exactitude des informations."],
        ["consentConditionalNature", "Confirmez la nature conditionnelle du service."],
        ["consentTerms", "Acceptez les conditions du service."],
        ["consentDataProcessing", "Acceptez le traitement des données du dossier."],
        ["consentAddressAdjustment", "Confirmez l'accord sur une solution équivalente."],
      ];
      for (const [key, message] of consents) {
        if (form[key] !== true) next[key] = message;
      }
    }
    return next;
  }

  function continueToNextStep() {
    const nextErrors = getStepErrors(step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError();
      return;
    }
    const nextStep = Math.min(4, step + 1) as Step;
    setStep(nextStep);
    setMaxStep((current) => Math.max(current, nextStep) as Step);
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(1, current - 1) as Step);
  }

  async function saveAndPay() {
    if (!user || !isEmailVerified) {
      setError("Un compte avec une adresse e-mail vérifiée est requis.");
      return;
    }
    if (locked || submitting) return;

    for (const targetStep of [1, 2, 3, 4] as const) {
      const nextErrors = getStepErrors(targetStep);
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        setStep(targetStep);
        focusFirstError();
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = await user.getIdToken(true);
      const saveResponse = await fetch("/api/client/housing-request", {
        method: "POST",
        headers: requestHeaders(token),
        body: JSON.stringify(form),
      });
      const savePayload = (await saveResponse.json()) as {
        request?: ClientHousingRequest;
        error?: string;
      };
      if (!saveResponse.ok || !savePayload.request) {
        throw new Error(savePayload.error ?? "HOUSING_REQUEST_FAILED");
      }
      setHousingRequest(savePayload.request);

      const checkoutResponse = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: requestHeaders(token),
        body: JSON.stringify({
          serviceType: "accommodation_certificate",
          housingRequestId: savePayload.request.id,
        }),
      });
      const checkout = (await checkoutResponse.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!checkoutResponse.ok || !checkout.checkoutUrl) {
        throw new Error(checkout.error ?? "Paiement Stripe indisponible.");
      }
      window.location.assign(checkout.checkoutUrl);
    } catch (cause) {
      setError(readApiError(cause instanceof Error ? cause.message : undefined));
      setSubmitting(false);
    }
  }

  async function openGeneratedDocument() {
    if (!user || !housingRequest?.documentId || openingDocument) return;
    setOpeningDocument(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/client/certificates/${encodeURIComponent(housingRequest.documentId)}/download`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("DOCUMENT_DOWNLOAD_FAILED");
      const objectUrl = URL.createObjectURL(await response.blob());
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError("Impossible d'ouvrir votre attestation pour le moment.");
    } finally {
      setOpeningDocument(false);
    }
  }

  const currentStep = steps.find((item) => item.id === step) ?? steps[0];
  const CurrentStepIcon = currentStep.icon;

  return (
    <DashboardLayout
      title="Attestation conditionnelle de logement"
      description="Préparez votre demande en quatre étapes, avec une résidence identifiée et une vérification opérationnelle avant émission."
    >
      <div className="mx-auto grid max-w-6xl gap-5" data-inventory-source={inventorySource}>
        <section className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Votre demande de logement</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Choisissez une ville et une résidence. Après paiement, le système vérifie
                  l'éligibilité de votre demande. Lorsque les conditions sont réunies,
                  l'attestation est générée automatiquement; sinon, AVI CERTIFY réalise une
                  vérification complémentaire avant de vous informer.
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
                  L'attestation constitue une pré-réservation conditionnelle. Elle ne vaut pas
                  bail définitif et ne garantit pas l'obtention du visa.
                </p>
              </div>
            </div>
            <span className="w-fit rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
              {housingRequest ? statusLabels[housingRequest.status] : "Nouvelle demande"}
            </span>
          </div>
        </section>

        <section aria-labelledby="housing-requests-title" className="rounded-md border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="housing-requests-title" className="font-semibold">Mes demandes de logement</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Suivez ici la dernière demande transmise à AVI CERTIFY.
              </p>
            </div>
            {housingRequest ? (
              <span className="w-fit rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                {statusLabels[housingRequest.status]}
              </span>
            ) : null}
          </div>
          {housingRequest ? (
            <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="text-muted-foreground">Référence</span><p className="mt-1 break-all font-medium">{housingRequest.id}</p></div>
              <div><span className="text-muted-foreground">Logement</span><p className="mt-1 font-medium">{housingRequest.residenceName ?? housingRequest.preferredCity}</p></div>
              <div><span className="text-muted-foreground">Paiement</span><p className="mt-1 font-medium">{housingRequest.paidAt ? "Confirmé" : housingRequest.status === "payment_pending" ? "En cours" : "En attente"}</p></div>
              <div><span className="text-muted-foreground">Prochaine étape</span><p className="mt-1 font-medium">{housingRequest.nextAction}</p></div>
              <div><span className="text-muted-foreground">Dernière mise à jour</span><p className="mt-1 font-medium">{formatDate(housingRequest.updatedAt)}</p></div>
              <div><span className="text-muted-foreground">Frais AVI CERTIFY</span><p className="mt-1 font-medium">{SERVICE_FEE_EUR} EUR</p></div>
              <div className="flex items-end gap-2 sm:col-span-2">
                {["draft", "awaiting_payment"].includes(housingRequest.status) ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => setStep(1)}>
                    Reprendre ma demande
                  </Button>
                ) : null}
                {housingRequest.documentAvailable ? (
                  <Button type="button" size="sm" variant="outline" disabled={openingDocument} onClick={() => void openGeneratedDocument()}>
                    {openingDocument ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Ouvrir l'attestation
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
              Aucune demande de logement en cours.
            </p>
          )}
        </section>

        {error ? (
          <div role="alert" className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}

        <nav aria-label="Progression de la demande" className="rounded-md border bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${step * 25}%` }} />
          </div>
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((item) => {
              const Icon = item.icon;
              const active = item.id === step;
              const available = item.id <= maxStep || locked;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!available}
                    aria-current={active ? "step" : undefined}
                    onClick={() => available && setStep(item.id)}
                    className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:text-sm ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : available
                          ? "border-border bg-white text-foreground hover:bg-muted/40"
                          : "cursor-not-allowed border-border bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="hidden md:inline">{item.label}</span>
                    <span className="md:hidden">{item.shortLabel}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {loading ? (
          <div className="rounded-md border bg-white p-6 text-sm text-muted-foreground" role="status">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement de votre dossier et du catalogue de logements...
          </div>
        ) : (
          <section className="rounded-md border bg-white p-5 shadow-sm md:p-7" data-testid={`housing-step-${step}`}>
            <div className="mb-6 flex items-start gap-3 border-b pb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
                <CurrentStepIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">Étape {step} sur 4</p>
                <h2 ref={stepTitleRef} tabIndex={-1} className="mt-1 text-xl font-semibold outline-none">
                  {currentStep.label}
                </h2>
              </div>
            </div>

            <fieldset disabled={submitting || locked}>
              {step === 1 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    ["studentFirstName", "Prénom", "text"],
                    ["studentLastName", "Nom", "text"],
                    ["studentPhone", "Téléphone", "tel"],
                    ["studentDateOfBirth", "Date de naissance", "date"],
                    ["studentPlaceOfBirth", "Lieu de naissance", "text"],
                  ] as const).map(([key, label, type]) => (
                    <label key={key} className="grid gap-2 text-sm font-medium">
                      {label}
                      <Input
                        type={type}
                        lang={type === "date" ? "fr" : undefined}
                        max={key === "studentDateOfBirth" ? today : undefined}
                        required
                        value={String(form[key])}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? `${key}-error` : undefined}
                        onChange={(event) => update(key, event.target.value)}
                      />
                      <FieldError id={`${key}-error`} message={errors[key]} />
                    </label>
                  ))}
                  <div>
                    <SearchableCombobox
                      label="Pays d'origine"
                      options={countryComboboxOptions}
                      value={form.originCountry?.codeAlpha2 ?? ""}
                      placeholder="Rechercher un pays..."
                      required
                      invalid={Boolean(errors.originCountry)}
                      describedBy={errors.originCountry ? "originCountry-error" : undefined}
                      onChange={(codeAlpha2) =>
                        update("originCountry", resolveCountryReference(codeAlpha2))
                      }
                    />
                    <FieldError id="originCountry-error" message={errors.originCountry} />
                  </div>
                  <div>
                    <SearchableCombobox
                      label="Pays de résidence actuel"
                      options={countryComboboxOptions}
                      value={form.currentResidenceCountry?.codeAlpha2 ?? ""}
                      placeholder="Rechercher un pays..."
                      required
                      invalid={Boolean(errors.currentResidenceCountry)}
                      describedBy={
                        errors.currentResidenceCountry
                          ? "currentResidenceCountry-error"
                          : undefined
                      }
                      onChange={(codeAlpha2) =>
                        update(
                          "currentResidenceCountry",
                          resolveCountryReference(codeAlpha2),
                        )
                      }
                    />
                    <FieldError
                      id="currentResidenceCountry-error"
                      message={errors.currentResidenceCountry}
                    />
                  </div>
                  <div>
                    <SearchableCombobox
                      label="Nationalité"
                      options={nationalityComboboxOptions}
                      value={form.nationality?.countryCodeAlpha2 ?? ""}
                      placeholder="Rechercher une nationalité..."
                      required
                      invalid={Boolean(errors.nationality)}
                      describedBy={errors.nationality ? "nationality-error" : undefined}
                      onChange={(codeAlpha2) => {
                        const nationality = nationalityOptions.find(
                          (option) => option.countryCodeAlpha2 === codeAlpha2,
                        );
                        update("nationality", nationality ?? null);
                      }}
                    />
                    <FieldError id="nationality-error" message={errors.nationality} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email du compte</Label>
                    <Input value={user?.email ?? ""} disabled />
                    <p className="text-xs text-muted-foreground">Cette adresse identifie votre dossier sécurisé.</p>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    ["schoolName", "Établissement", "text"],
                    ["schoolCity", "Ville de l'établissement", "text"],
                    ["academicYear", "Année académique", "text"],
                    ["expectedArrivalDate", "Date d'arrivée envisagée", "date"],
                  ] as const).map(([key, label, type]) => (
                    <label key={key} className="grid gap-2 text-sm font-medium">
                      {label}
                      <Input
                        type={type}
                        lang={type === "date" ? "fr" : undefined}
                        min={key === "expectedArrivalDate" ? today : undefined}
                        required
                        value={String(form[key])}
                        aria-invalid={Boolean(errors[key])}
                        aria-describedby={errors[key] ? `${key}-error` : undefined}
                        onChange={(event) => update(key, event.target.value)}
                      />
                      <FieldError id={`${key}-error`} message={errors[key]} />
                    </label>
                  ))}
                  <label className="grid gap-2 text-sm font-medium">
                    Durée estimée du séjour (mois)
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      required
                      value={form.expectedStayDurationMonths}
                      aria-invalid={Boolean(errors.expectedStayDurationMonths)}
                      aria-describedby={errors.expectedStayDurationMonths ? "duration-error" : undefined}
                      onChange={(event) => update("expectedStayDurationMonths", Number(event.target.value))}
                    />
                    <FieldError id="duration-error" message={errors.expectedStayDurationMonths} />
                  </label>
                  <label className="grid gap-2 text-sm font-medium">
                    Pays de destination
                    <Select
                      required
                      value={form.destinationCountry.codeAlpha2}
                      onChange={() => update("destinationCountry", franceCountryReference)}
                    >
                      <option value="FR">France · FR · FRA</option>
                    </Select>
                    <p className="text-xs font-normal text-muted-foreground">
                      L'attestation conditionnelle de logement est actuellement disponible en France.
                    </p>
                  </label>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-5">
                  {inventoryError ? (
                    <div className="flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between" role="status">
                      <span>{inventoryError}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (form.preferredCityCode) {
                            setResidenceReloadKey((current) => current + 1);
                          } else {
                            void loadCities();
                          }
                        }}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Réessayer
                      </Button>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <SearchableCombobox
                        label="Ville souhaitée"
                        options={cityComboboxOptions}
                        value={form.preferredCityCode}
                        placeholder="Rechercher Paris, Lille, Toulouse..."
                        emptyMessage="Aucune ville ne correspond à votre recherche."
                        required
                        invalid={Boolean(errors.preferredCityCode)}
                        describedBy={
                          errors.preferredCityCode
                            ? "preferredCityCode-error"
                            : undefined
                        }
                        onChange={(preferredCityCode) => {
                          setForm((current) => ({
                            ...current,
                            preferredCityCode,
                            housingInventoryId: "",
                            accommodationType: "",
                          }));
                          setResidences([]);
                          setErrors((current) => ({
                            ...current,
                            preferredCityCode: undefined,
                            housingInventoryId: undefined,
                            accommodationType: undefined,
                          }));
                          setInventoryError(null);
                        }}
                      />
                      <FieldError
                        id="preferredCityCode-error"
                        message={errors.preferredCityCode}
                      />
                    </div>
                    <label className="grid gap-2 text-sm font-medium">
                      Résidence souhaitée
                      <Select
                        required
                        disabled={!form.preferredCityCode || residencesLoading}
                        value={form.housingInventoryId}
                        aria-invalid={Boolean(errors.housingInventoryId)}
                        onChange={(event) => {
                          const residence = residences.find((item) => item.id === event.target.value);
                          update("housingInventoryId", event.target.value);
                          update(
                            "accommodationType",
                            residence?.accommodationTypes[0] ?? "",
                          );
                        }}
                      >
                        <option value="">
                          {residencesLoading
                            ? "Chargement des résidences disponibles..."
                            : form.preferredCityCode
                              ? "Sélectionner une résidence"
                              : "Choisissez d'abord une ville"}
                        </option>
                        {residences.map((residence) => (
                          <option key={residence.id} value={residence.id}>
                            {residence.residenceName} · {residence.municipality}
                            {residence.monthlyRent ? ` · ${residence.monthlyRent} EUR/mois` : ""}
                          </option>
                        ))}
                      </Select>
                      <FieldError id="housingInventoryId-error" message={errors.housingInventoryId} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Type de logement souhaité
                      <Select
                        value={form.accommodationType}
                        disabled={!selectedResidence}
                        aria-invalid={Boolean(errors.accommodationType)}
                        onChange={(event) => update("accommodationType", event.target.value as HousingAccommodationType)}
                      >
                        <option value="">Sélectionner un type</option>
                        {(selectedResidence?.accommodationTypes ?? []).map((type) => (
                          <option key={type} value={type}>{accommodationLabels[type]}</option>
                        ))}
                      </Select>
                      <FieldError id="accommodationType-error" message={errors.accommodationType} />
                    </label>
                  </div>

                  {selectedResidence ? (
                    <article className="grid gap-4 rounded-md border border-emerald-200 bg-emerald-50/40 p-5 md:grid-cols-[1fr_auto]" data-testid="selected-residence-card">
                      <div>
                        <p className="text-xs font-semibold uppercase text-emerald-700">Résidence sélectionnée</p>
                        <h3 className="mt-1 text-lg font-semibold">{selectedResidence.residenceName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedResidence.partnerName} · {selectedResidence.municipality}</p>
                        <p className="mt-2 text-sm">Type choisi : <span className="font-medium">{form.accommodationType ? accommodationLabels[form.accommodationType] : "À sélectionner"}</span></p>
                        <div className="mt-4 flex items-start gap-2 text-sm">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                          <span>
                            {selectedResidence.publicAddress?.displayToClient
                              ? selectedResidence.publicAddress.formattedAddress
                              : `Zone publique : ${selectedResidence.municipality}. L'adresse exacte sera confirmée après vérification.`}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-44 rounded-md border bg-white p-4 text-sm">
                        <p className="text-muted-foreground">Loyer indicatif</p>
                        <p className="mt-1 text-xl font-semibold">
                          {selectedResidence.monthlyRent
                            ? `${selectedResidence.monthlyRent} EUR/mois`
                            : "À confirmer"}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedResidence.availabilityLabel}</p>
                      </div>
                      {selectedResidence.processingMode === "manual_review" ? (
                        <p className="text-sm leading-6 text-emerald-950 md:col-span-2">
                          Cette résidence est disponible pour une demande de pré-réservation conditionnelle. Après paiement, AVI CERTIFY effectuera une vérification avant l'émission du document.
                        </p>
                      ) : null}
                    </article>
                  ) : (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Sélectionnez une ville puis une résidence pour afficher le prix, le type de logement et l'adresse publique disponible.
                    </div>
                  )}
                  <FieldError id="inventory-error" message={errors.inventory} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      Besoins particuliers <span className="font-normal text-muted-foreground">(facultatif)</span>
                      <Textarea maxLength={500} value={form.specialNeeds} onChange={(event) => update("specialNeeds", event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Notes utiles <span className="font-normal text-muted-foreground">(facultatif)</span>
                      <Textarea maxLength={1000} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
                    </label>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="grid gap-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border p-4 text-sm">
                      <p className="font-semibold">Étudiant</p>
                      <p className="mt-2">{form.studentFirstName} {form.studentLastName}</p>
                      <p className="mt-1 text-muted-foreground">{user?.email}</p>
                      <p className="mt-1 text-muted-foreground">Né(e) le {formatDate(form.studentDateOfBirth)} à {form.studentPlaceOfBirth}</p>
                      <p className="mt-1 text-muted-foreground">{form.nationality?.label ?? "Nationalité à sélectionner"} · {form.studentPhone}</p>
                      <p className="mt-1 text-muted-foreground">
                        Origine : {form.originCountry?.label ?? "À sélectionner"} · Résidence : {form.currentResidenceCountry?.label ?? "À sélectionner"}
                      </p>
                    </div>
                    <div className="rounded-md border p-4 text-sm">
                      <p className="font-semibold">Projet académique</p>
                      <p className="mt-2">{form.schoolName}</p>
                      <p className="mt-1 text-muted-foreground">{form.schoolCity} · {form.academicYear}</p>
                      <p className="mt-1 text-muted-foreground">Destination : {form.destinationCountry.label}</p>
                      <p className="mt-1 text-muted-foreground">Arrivée le {formatDate(form.expectedArrivalDate)} · {form.expectedStayDurationMonths} mois</p>
                    </div>
                    <div className="rounded-md border p-4 text-sm">
                      <p className="font-semibold">Logement</p>
                      <p className="mt-2">{selectedResidence?.residenceName ?? housingRequest?.preferredCity ?? "À sélectionner"}</p>
                      <p className="mt-1 text-muted-foreground">{selectedCity?.label ?? form.preferredCityCode} · {selectedResidence?.municipality ?? "Commune à confirmer"}</p>
                      <p className="mt-1 text-muted-foreground">{form.accommodationType ? accommodationLabels[form.accommodationType] : "Type à sélectionner"} · {selectedResidence?.availabilityLabel ?? "Disponibilité conditionnelle"}</p>
                      <p className="mt-1 text-muted-foreground">
                        {selectedResidence?.publicAddress?.displayToClient
                          ? selectedResidence.publicAddress.formattedAddress
                          : "Adresse exacte à confirmer"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-md border">
                    <div className="flex items-start justify-between gap-4 border-b bg-muted/20 p-4 text-sm">
                      <div>
                        <p className="font-semibold">Loyer indicatif de la résidence</p>
                        <p className="mt-1 text-muted-foreground">Information indicative, non encaissée lors de ce paiement.</p>
                      </div>
                      <p className="whitespace-nowrap font-semibold">
                        {selectedResidence?.indicativeMonthlyRent ?? housingRequest?.indicativeMonthlyRent
                          ? `${selectedResidence?.indicativeMonthlyRent ?? housingRequest?.indicativeMonthlyRent} EUR/mois`
                          : "À confirmer"}
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b p-4 text-sm">
                      <div>
                        <p className="font-semibold">Frais de service AVI CERTIFY</p>
                        <p className="mt-1 text-muted-foreground">Traitement de la demande et attestation conditionnelle.</p>
                      </div>
                      <p className="whitespace-nowrap font-semibold">{SERVICE_FEE_EUR} EUR</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 bg-emerald-50 p-4">
                      <p className="font-semibold">Montant réglé maintenant</p>
                      <p className="text-xl font-semibold text-emerald-800">{SERVICE_FEE_EUR} EUR</p>
                    </div>
                  </div>

                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    {selectedResidence?.processingMode === "manual_review" || inventorySource === "bootstrap"
                      ? "Cette résidence nécessite une vérification AVI CERTIFY après paiement avant toute émission de document."
                      : "Après paiement, le système vérifie l'éligibilité. L'attestation est générée automatiquement lorsque toutes les conditions sont réunies; sinon, AVI CERTIFY effectue une vérification complémentaire."}
                  </div>

                  <div className="grid gap-3">
                    {([
                      ["consentAccuracy", "Je confirme l'exactitude des informations fournies."],
                      ["consentConditionalNature", "Je comprends que la proposition et l'attestation sont conditionnelles."],
                      ["consentTerms", "J'accepte les conditions du service."],
                      ["consentDataProcessing", "J'accepte le traitement des données nécessaires au dossier."],
                      ["consentAddressAdjustment", "J'accepte qu'une solution équivalente remplace la résidence proposée en cas d'indisponibilité, après information."],
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="flex items-start gap-3 text-sm leading-6">
                          <input
                            type="checkbox"
                            required
                            checked={form[key]}
                            onChange={(event) => update(key, event.target.checked)}
                            className="mt-1 h-4 w-4 rounded border-input accent-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <span>{label}</span>
                        </label>
                        <FieldError id={`${key}-error`} message={errors[key]} />
                      </div>
                    ))}
                  </div>
                  <p className="rounded-md border bg-muted/20 p-4 text-sm leading-6">
                    Les 99 € correspondent aux frais de traitement et d'émission de l'attestation conditionnelle. Ils ne constituent ni le paiement du loyer, ni un dépôt de garantie, ni une caution.
                  </p>
                </div>
              ) : null}
            </fieldset>

            <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" disabled={step === 1 || submitting} onClick={goBack}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour
              </Button>
              {step < 4 ? (
                <Button type="button" variant="cta" disabled={submitting || locked} onClick={continueToNextStep}>
                  {step === 3 ? "Vérifier ma demande" : "Continuer"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : locked ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800" role="status">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  {statusLabels[housingRequest?.status ?? "payment_pending"]}
                </div>
              ) : (
                <Button type="button" size="lg" variant="cta" disabled={submitting || inventorySource === "unavailable"} onClick={() => void saveAndPay()} data-testid="housing-payment-button">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                  {submitting ? "Préparation du paiement..." : `Payer ${SERVICE_FEE_EUR} € et transmettre ma demande`}
                </Button>
              )}
            </div>
          </section>
        )}

        {housingRequest?.status === "requires_admin_review" ||
        housingRequest?.status === "admin_review_in_progress" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
            Votre paiement est confirmé. Votre demande nécessite une vérification administrative avant émission de l'attestation. Aucun paiement supplémentaire n'est requis.
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          Le montant de 99 EUR est fixé côté serveur. Aucune donnée bancaire n'est conservée par AVI CERTIFY. Une adresse exacte n'est affichée que lorsqu'elle a été validée pour le client.
        </p>
      </div>
    </DashboardLayout>
  );
}
