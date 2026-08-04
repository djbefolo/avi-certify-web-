"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { getStudentProfile } from "@/lib/profile/student-profile";
import type { HousingRequest, HousingRequestStatus } from "@/types/housing";

type HousingForm = {
  studentFirstName: string;
  studentLastName: string;
  studentPhone: string;
  studentDateOfBirth: string;
  studentPlaceOfBirth: string;
  nationality: string;
  originCountry: string;
  currentResidenceCountry: string;
  destinationCountry: "France";
  preferredCityCode: string;
  housingInventoryId: string;
  schoolName: string;
  schoolCity: string;
  academicYear: string;
  expectedArrivalDate: string;
  expectedStayDurationMonths: number;
  accommodationType: "studio" | "t1_bis" | "t2" | "shared" | "other";
  specialNeeds: string;
  notes: string;
  consentAccuracy: boolean;
  consentConditionalNature: boolean;
  consentTerms: boolean;
  consentDataProcessing: boolean;
  consentAddressAdjustment: boolean;
};

type HousingCityOption = {
  code: string;
  label: string;
  country: "France";
  residenceCount: number;
};

type HousingResidenceOption = {
  id: string;
  internalReference: string;
  cityCode: string;
  cityLabel: string;
  municipality: string;
  residenceName: string;
  partnerName: string;
  accommodationTypes: HousingForm["accommodationType"][];
  indicativeMonthlyRent: number | null;
  currency: "EUR";
  availabilityStatus: string;
  publicDescription: string | null;
  publicAddress: {
    formattedAddress: string;
    displayToClient: true;
  } | null;
};

const initialForm: HousingForm = {
  studentFirstName: "",
  studentLastName: "",
  studentPhone: "",
  studentDateOfBirth: "",
  studentPlaceOfBirth: "",
  nationality: "",
  originCountry: "",
  currentResidenceCountry: "",
  destinationCountry: "France",
  preferredCityCode: "",
  housingInventoryId: "",
  schoolName: "",
  schoolCity: "",
  academicYear: "2026-2027",
  expectedArrivalDate: "",
  expectedStayDurationMonths: 12,
  accommodationType: "studio",
  specialNeeds: "",
  notes: "",
  consentAccuracy: false,
  consentConditionalNature: false,
  consentTerms: false,
  consentDataProcessing: false,
  consentAddressAdjustment: false,
};

const statusLabels: Record<HousingRequestStatus, string> = {
  draft: "Formulaire a completer",
  awaiting_payment: "En attente de paiement",
  payment_pending: "Paiement en cours",
  payment_confirmed: "Paiement confirme",
  auto_validation_pending: "Validation automatique en cours",
  auto_approved_generation_queued: "Attestation en preparation",
  requires_admin_review: "Paiement confirme - verification administrative en cours",
  admin_review_in_progress: "Verification administrative en cours",
  admin_approved_generation_queued: "Attestation approuvee et en preparation",
  generation_processing: "Document en generation",
  allocation_pending: "Confirmation partenaire en cours",
  conditionally_reserved: "Solution conditionnelle confirmee",
  certificate_generation_pending: "Document en generation",
  certificate_generated: "Document disponible",
  certificate_delivered: "Document disponible et notification envoyee",
  replaced: "Document remplace",
  revoked: "Document revoque",
  expired: "Document expire",
  failed: "Intervention AVI CERTIFY requise",
};

function requestHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export default function HousingRequestPage() {
  const { user, isEmailVerified } = useAuth();
  const [form, setForm] = useState<HousingForm>(initialForm);
  const [housingRequest, setHousingRequest] = useState<HousingRequest | null>(null);
  const [cities, setCities] = useState<HousingCityOption[]>([]);
  const [residences, setResidences] = useState<HousingResidenceOption[]>([]);
  const [residencesLoading, setResidencesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedResidence = useMemo(
    () => residences.find((item) => item.id === form.housingInventoryId),
    [form.housingInventoryId, residences],
  );
  const locked = Boolean(
    housingRequest && !["draft", "awaiting_payment"].includes(housingRequest.status),
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !isEmailVerified) {
        setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const [profile, response, citiesResponse] = await Promise.all([
          getStudentProfile(user.uid),
          fetch("/api/client/housing-request", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch("/api/client/housing/cities", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);
        const payload = response.ok
          ? ((await response.json()) as { request: HousingRequest | null })
          : { request: null };
        if (cancelled) return;
        if (citiesResponse.ok) {
          const citiesPayload = (await citiesResponse.json()) as {
            cities: HousingCityOption[];
          };
          setCities(citiesPayload.cities);
        }
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
            destinationCountry: "France",
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
        } else if (profile) {
          setForm((current) => ({
            ...current,
            studentFirstName: profile.firstName ?? "",
            studentLastName: profile.lastName ?? "",
            studentPhone: profile.phoneWhatsApp ?? "",
            studentDateOfBirth: profile.dateOfBirth ?? profile.birthDate ?? "",
            studentPlaceOfBirth: profile.placeOfBirth ?? "",
            nationality: profile.nationality ?? "",
            originCountry: profile.birthCountry ?? "",
            currentResidenceCountry: profile.countryOfResidence ?? "",
            schoolName: profile.targetSchoolName ?? "",
            schoolCity: profile.destinationCity ?? "",
            academicYear: profile.intendedAcademicYear ?? current.academicYear,
            expectedArrivalDate: profile.intendedArrivalDate ?? "",
          }));
        }
      } catch {
        if (!cancelled) setError("Impossible de charger la demande logement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadResidences() {
      if (!user || !isEmailVerified || !form.preferredCityCode) {
        setResidences([]);
        return;
      }
      setResidencesLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/client/housing/residences?cityCode=${encodeURIComponent(form.preferredCityCode)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error("HOUSING_INVENTORY_UNAVAILABLE");
        const payload = (await response.json()) as {
          residences: HousingResidenceOption[];
        };
        if (!cancelled) setResidences(payload.residences);
      } catch {
        if (!cancelled) {
          setResidences([]);
          setError("Impossible de charger les residences disponibles.");
        }
      } finally {
        if (!cancelled) setResidencesLoading(false);
      }
    }
    void loadResidences();
    return () => {
      cancelled = true;
    };
  }, [form.preferredCityCode, isEmailVerified, user]);

  function update<K extends keyof HousingForm>(key: K, value: HousingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAndPay() {
    if (!user || !isEmailVerified) {
      setError("Un compte avec email verifie est requis.");
      return;
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
        request?: HousingRequest;
        error?: string;
      };
      if (!saveResponse.ok || !savePayload.request) {
        throw new Error(savePayload.error ?? "Demande logement invalide.");
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
      setError(cause instanceof Error ? cause.message : "Operation impossible.");
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout
      title="Attestation conditionnelle de logement"
      description="Preparez une proposition de logement pour votre dossier etudiant, sous reserve de disponibilite partenaire."
    >
      <div className="mx-auto grid max-w-6xl gap-5">
        <section className="rounded-md border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Proposition conditionnelle</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Le paiement lance la verification operationnelle. Une adresse exacte
                  n&apos;est emise qu&apos;apres confirmation datee du partenaire. Le document
                  ne constitue ni un bail definitif ni une garantie de visa.
                </p>
              </div>
            </div>
            <span className="rounded-md border bg-muted/20 px-3 py-2 text-sm font-semibold">
              {housingRequest ? statusLabels[housingRequest.status] : "Nouvelle demande"}
            </span>
          </div>
        </section>

        {error ? (
          <div role="alert" className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        ) : null}
        {loading ? (
          <div className="rounded-md border bg-white p-5 text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement de votre demande...
          </div>
        ) : null}

        <fieldset disabled={loading || submitting || locked} className="grid gap-5">
          <section className="rounded-md border bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Identite de l&apos;etudiant</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {([
                ["studentFirstName", "Prenom", "text"],
                ["studentLastName", "Nom", "text"],
                ["studentPhone", "Telephone", "tel"],
                ["studentDateOfBirth", "Date de naissance", "date"],
                ["studentPlaceOfBirth", "Lieu de naissance", "text"],
                ["nationality", "Nationalite", "text"],
                ["originCountry", "Pays d'origine", "text"],
                ["currentResidenceCountry", "Pays de residence actuel", "text"],
              ] as const).map(([key, label, type]) => (
                <label key={key} className="grid gap-2 text-sm font-medium">
                  {label}
                  <Input
                    type={type}
                    required
                    value={String(form[key])}
                    onChange={(event) => update(key, event.target.value)}
                  />
                </label>
              ))}
              <div className="grid gap-2">
                <Label>Email du compte</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
            </div>
          </section>

          <section className="rounded-md border bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Projet academique et logement</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Ville souhaitee
                <Select
                  required
                  value={form.preferredCityCode}
                  onChange={(event) => {
                    update("preferredCityCode", event.target.value);
                    update("housingInventoryId", "");
                  }}
                >
                  <option value="">Selectionner une ville</option>
                  {cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.label} ({city.residenceCount} residence{city.residenceCount > 1 ? "s" : ""})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Residence souhaitee
                <Select
                  required
                  disabled={!form.preferredCityCode || residencesLoading}
                  value={form.housingInventoryId}
                  onChange={(event) => {
                    const residence = residences.find(
                      (item) => item.id === event.target.value,
                    );
                    update("housingInventoryId", event.target.value);
                    if (
                      residence &&
                      !residence.accommodationTypes.includes(form.accommodationType)
                    ) {
                      update("accommodationType", residence.accommodationTypes[0] ?? "other");
                    }
                  }}
                >
                  <option value="">
                    {residencesLoading
                      ? "Chargement des residences..."
                      : "Selectionner une residence"}
                  </option>
                  {residences.map((residence) => (
                    <option key={residence.id} value={residence.id}>
                      {residence.residenceName} - {residence.municipality}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Type de logement souhaite
                <Select
                  value={form.accommodationType}
                  disabled={!selectedResidence}
                  onChange={(event) => update("accommodationType", event.target.value as HousingForm["accommodationType"])}
                >
                  {(selectedResidence?.accommodationTypes ?? []).map((type) => (
                    <option key={type} value={type}>
                      {type === "studio"
                        ? "Studio"
                        : type === "t1_bis"
                          ? "T1 bis"
                          : type === "t2"
                            ? "T2"
                            : type === "shared"
                              ? "Colocation"
                              : "Autre"}
                    </option>
                  ))}
                </Select>
              </label>
              {([
                ["schoolName", "Etablissement", "text"],
                ["schoolCity", "Ville de l'etablissement", "text"],
                ["academicYear", "Annee academique", "text"],
                ["expectedArrivalDate", "Date d'arrivee envisagee", "date"],
              ] as const).map(([key, label, type]) => (
                <label key={key} className="grid gap-2 text-sm font-medium">
                  {label}
                  <Input type={type} required value={String(form[key])} onChange={(event) => update(key, event.target.value)} />
                </label>
              ))}
              <label className="grid gap-2 text-sm font-medium">
                Duree estimee (mois)
                <Input type="number" min={1} max={24} required value={form.expectedStayDurationMonths} onChange={(event) => update("expectedStayDurationMonths", Number(event.target.value))} />
              </label>
              <div className="rounded-md border bg-muted/20 p-4 text-sm">
                <p className="font-semibold">Disponibilite indicative</p>
                <p className="mt-2 text-muted-foreground">
                  {selectedResidence
                    ? `${selectedResidence.residenceName} : ${selectedResidence.indicativeMonthlyRent ? `loyer affiche a partir de ${selectedResidence.indicativeMonthlyRent} EUR. ` : ""}La disponibilite reste conditionnelle.`
                    : "Selectionnez une residence pour voir son statut."}
                </p>
                {selectedResidence ? (
                  <p className="mt-2 text-muted-foreground">
                    {selectedResidence.publicAddress?.displayToClient
                      ? `Adresse publique : ${selectedResidence.publicAddress.formattedAddress}`
                      : "Adresse publique en attente de validation."}
                  </p>
                ) : null}
              </div>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Besoins particuliers
                <Textarea maxLength={500} value={form.specialNeeds} onChange={(event) => update("specialNeeds", event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm font-medium md:col-span-2">
                Notes utiles
                <Textarea maxLength={1000} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-md border bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Confirmations obligatoires</h2>
            <div className="mt-4 grid gap-3">
              {([
                ["consentAccuracy", "Je confirme l'exactitude des informations fournies."],
                ["consentConditionalNature", "Je comprends que la proposition et l'attestation sont conditionnelles."],
                ["consentTerms", "J'accepte les conditions du service."],
                ["consentDataProcessing", "J'accepte le traitement des donnees necessaires au dossier."],
                ["consentAddressAdjustment", "J'accepte qu'une solution equivalente remplace l'adresse proposee en cas d'indisponibilite."],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-start gap-3 text-sm leading-6">
                  <input type="checkbox" required checked={form[key]} onChange={(event) => update(key, event.target.checked)} className="mt-1 h-4 w-4" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>
        </fieldset>

        <section className="flex flex-col gap-4 rounded-md border border-emerald-200 bg-emerald-50/60 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">Service : 79 EUR</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Le prix est fixe cote serveur. Aucune donnee bancaire n&apos;est conservee par AVI CERTIFY.
            </p>
          </div>
          {locked ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              {statusLabels[housingRequest?.status ?? "payment_pending"]}
            </div>
          ) : (
            <Button type="button" size="lg" variant="cta" disabled={loading || submitting} onClick={() => void saveAndPay()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
              {submitting ? "Preparation du paiement..." : "Enregistrer et payer avec Stripe"}
            </Button>
          )}
        </section>

        {housingRequest?.status === "requires_admin_review" ||
        housingRequest?.status === "admin_review_in_progress" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
            Votre paiement est confirme. Votre demande necessite une verification administrative avant emission de l&apos;attestation. Aucun paiement supplementaire n&apos;est requis.
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          Apres confirmation du paiement, toute correction d&apos;une donnee juridiquement sensible doit etre traitee par AVI CERTIFY et peut conduire a une nouvelle version du document.
        </p>
      </div>
    </DashboardLayout>
  );
}
