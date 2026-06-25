"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MailCheck,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGuideRequest } from "@/hooks/use-guide-request";

type GuideRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origin?: string;
};

type GuideRequestFormValues = {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  destinationCountry: string;
  projectHorizon: string;
  marketingConsent: boolean;
};

type GuideRequestFormErrors = Partial<
  Record<keyof GuideRequestFormValues, string>
>;

const defaultValues: GuideRequestFormValues = {
  fullName: "",
  email: "",
  phone: "",
  country: "",
  destinationCountry: "France",
  projectHorizon: "",
  marketingConsent: false,
};

const countryOptions = [
  "Cameroun",
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Guinée",
  "Gabon",
  "Congo",
  "RDC",
  "Togo",
  "Bénin",
  "Maroc",
  "Tunisie",
  "Autre",
] as const;

const destinationCountryOptions = [
  "France",
  "Belgique",
  "Allemagne",
  "Espagne",
  "Canada",
  "Autre",
] as const;

const projectHorizonOptions = [
  { value: "moins-3-mois", label: "Moins de 3 mois" },
  { value: "3-6-mois", label: "Entre 3 et 6 mois" },
  { value: "rentree-2026", label: "Rentrée 2026" },
  { value: "je-ne-sais-pas", label: "Je ne sais pas encore" },
] as const;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateGuideRequestForm(
  values: GuideRequestFormValues,
): GuideRequestFormErrors {
  const errors: GuideRequestFormErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = "Indiquez votre nom complet.";
  }

  if (!isValidEmail(values.email)) {
    errors.email = "Renseignez une adresse email valide.";
  }

  if (!values.marketingConsent) {
    errors.marketingConsent =
      "Le consentement est obligatoire pour recevoir le guide.";
  }

  return errors;
}

type FieldErrorProps = {
  id: string;
  message?: string;
};

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function GuideRequestModal({
  open,
  onOpenChange,
  origin = "floating_cta",
}: GuideRequestModalProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const descriptionId = `${formId}-description`;
  const fullNameRef = useRef<HTMLInputElement>(null);
  const [values, setValues] =
    useState<GuideRequestFormValues>(defaultValues);
  const [errors, setErrors] = useState<GuideRequestFormErrors>({});
  const { state, submitGuideRequest, resetGuideRequest } = useGuideRequest();
  const isSubmitting = state.status === "submitting";

  useEffect(() => {
    if (!open) {
      setValues(defaultValues);
      setErrors({});
      resetGuideRequest();
      return;
    }

    const focusTimer = window.setTimeout(() => {
      fullNameRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onOpenChange, open, resetGuideRequest]);

  if (!open) {
    return null;
  }

  const fieldId = (name: keyof GuideRequestFormValues) =>
    `${formId}-${name}`;
  const errorId = (name: keyof GuideRequestFormValues) =>
    `${fieldId(name)}-error`;
  const describeField = (name: keyof GuideRequestFormValues) =>
    errors[name] ? errorId(name) : undefined;

  const handleTextChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setValues((current) => ({
      ...current,
      [name]: value,
    }));
    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  };

  const handleConsentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({
      ...current,
      marketingConsent: event.target.checked,
    }));
    setErrors((current) => ({
      ...current,
      marketingConsent: undefined,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateGuideRequestForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await submitGuideRequest({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      country: values.country,
      destinationCountry: values.destinationCountry,
      serviceInterest: "guide_france_2026",
      projectHorizon: values.projectHorizon,
      origin,
      marketingConsent: true,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 px-4 py-5 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onOpenChange(false);
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-background shadow-2xl"
        role="dialog"
      >
        <div className="relative overflow-hidden rounded-t-2xl bg-[hsl(222,75%,8%)] px-6 py-6 text-white sm:px-8">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-accent-light">
                Guide 2026 gratuit
              </p>
              <h2
                id={titleId}
                className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                Réussir son installation en France
              </h2>
              <p id={descriptionId} className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                Recevez le guide AVI CERTIFY pour éviter les erreurs qui
                bloquent un projet d'études en France. L'accès reste sécurisé :
                aucun PDF public n'est exposé.
              </p>
            </div>
            <button
              aria-label="Fermer la fenetre guide"
              className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <form className="grid gap-5 p-6 sm:p-8" noValidate onSubmit={handleSubmit}>
          {state.status === "success" ? (
            <div
              className="flex gap-3 rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm leading-6 text-foreground"
              role="status"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                aria-hidden="true"
              />
              <p>{state.message}</p>
            </div>
          ) : null}

          {state.status === "error" ? (
            <div
              className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-6 text-foreground"
              role="alert"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <p>{state.message}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={fieldId("fullName")}>Nom complet</Label>
              <Input
                ref={fullNameRef}
                aria-describedby={describeField("fullName")}
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                id={fieldId("fullName")}
                name="fullName"
                onChange={handleTextChange}
                placeholder="Ex. Awa Ndiaye"
                value={values.fullName}
              />
              <FieldError id={errorId("fullName")} message={errors.fullName} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={fieldId("email")}>Email</Label>
              <Input
                aria-describedby={describeField("email")}
                aria-invalid={Boolean(errors.email)}
                autoComplete="email"
                id={fieldId("email")}
                inputMode="email"
                name="email"
                onChange={handleTextChange}
                placeholder="Ex. awa@email.com"
                type="email"
                value={values.email}
              />
              <FieldError id={errorId("email")} message={errors.email} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={fieldId("phone")}>Téléphone WhatsApp optionnel</Label>
              <Input
                autoComplete="tel"
                id={fieldId("phone")}
                inputMode="tel"
                name="phone"
                onChange={handleTextChange}
                placeholder="Ex. +237 699 000 000"
                value={values.phone}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={fieldId("country")}>Pays de résidence optionnel</Label>
              <Select
                id={fieldId("country")}
                name="country"
                onChange={handleTextChange}
                value={values.country}
              >
                <option value="">Sélectionner</option>
                {countryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={fieldId("destinationCountry")}>
                Pays de destination
              </Label>
              <Select
                id={fieldId("destinationCountry")}
                name="destinationCountry"
                onChange={handleTextChange}
                value={values.destinationCountry}
              >
                {destinationCountryOptions.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={fieldId("projectHorizon")}>Horizon du projet</Label>
              <Select
                id={fieldId("projectHorizon")}
                name="projectHorizon"
                onChange={handleTextChange}
                value={values.projectHorizon}
              >
                <option value="">Sélectionner</option>
                {projectHorizonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <div
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-muted/30 p-4",
                errors.marketingConsent
                  ? "border-destructive/40"
                  : "border-border",
              )}
            >
              <input
                aria-describedby={describeField("marketingConsent")}
                aria-invalid={Boolean(errors.marketingConsent)}
                checked={values.marketingConsent}
                className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                id={fieldId("marketingConsent")}
                name="marketingConsent"
                onChange={handleConsentChange}
                type="checkbox"
              />
              <Label
                className="text-sm font-normal leading-6 text-muted-foreground"
                htmlFor={fieldId("marketingConsent")}
              >
                J'accepte de recevoir le guide et des communications AVI
                CERTIFY liées à mon projet d'études. Je comprends que ce
                consentement est requis pour cette demande de guide.
              </Label>
            </div>
            <FieldError
              id={errorId("marketingConsent")}
              message={errors.marketingConsent}
            />
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MailCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              <span>Accès envoyé par email, jamais en téléchargement public.</span>
            </div>
            <Button
              className="sm:min-w-48"
              disabled={isSubmitting}
              type="submit"
              variant="cta"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isSubmitting ? "Envoi..." : "Envoyer ma demande"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
