"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useForm, type FieldErrors, type SubmitHandler } from "react-hook-form";
import {
  destinationCountryOptions,
  requestedServiceOptions,
  residenceCountryOptions,
} from "@/constants/lead-options";
import {
  leadFormSchema,
  type LeadFormInput,
  type LeadFormValues,
} from "@/lib/validations/lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAnalytics } from "@/hooks/use-analytics";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const defaultValues: LeadFormInput = {
  fullName: "",
  phone: "",
  email: "",
  residenceCountry: "",
  destinationCountry: "",
  requestedService: "",
  message: "",
  consent: false,
};

type LeadApiErrorResponse = {
  error?: string;
};

async function parseLeadApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as LeadApiErrorResponse;

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Ignore malformed error payloads and fall back to a stable UX message.
  }

  if (response.status === 429) {
    return "Trop de demandes ont été envoyées. Veuillez patienter avant de réessayer.";
  }

  return "Impossible d'enregistrer la demande pour le moment. Veuillez réessayer.";
}

async function submitLead(values: LeadFormValues): Promise<void> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });

  if (!response.ok) {
    throw new Error(await parseLeadApiError(response));
  }
}

function getErrorMessage(
  errors: FieldErrors<LeadFormInput>,
  name: keyof LeadFormInput,
) {
  const message = errors[name]?.message;

  return typeof message === "string" ? message : undefined;
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

export function LeadForm() {
  const formId = useId();
  const submitLockRef = useRef(false);
  const { trackLeadSubmitted } = useAnalytics();
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormInput>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const fieldId = (name: keyof LeadFormInput) => `${formId}-${name}`;
  const errorId = (name: keyof LeadFormInput) => `${fieldId(name)}-error`;

  const describeField = (name: keyof LeadFormInput) =>
    getErrorMessage(errors, name) ? errorId(name) : undefined;

  const onSubmit: SubmitHandler<LeadFormInput> = async (input) => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setSubmitState({ status: "idle" });

    try {
      const values = leadFormSchema.parse(input);

      await submitLead(values);
      trackLeadSubmitted(values.requestedService);
      reset(defaultValues);
      setSubmitState({
        status: "success",
        message:
          "Votre demande a bien été envoyée. Un conseiller AVI CERTIFY pourra vous recontacter pour la suite.",
      });
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Impossible d'envoyer la demande pour le moment. Vérifiez les informations puis réessayez.",
      });
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      {submitState.status === "success" ? (
        <div
          className="flex gap-3 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm text-foreground"
          role="status"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-accent"
            aria-hidden="true"
          />
          <p>{submitState.message}</p>
        </div>
      ) : null}

      {submitState.status === "error" ? (
        <div
          className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground"
          role="alert"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p>{submitState.message}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={fieldId("fullName")}>Nom complet</Label>
          <Input
            id={fieldId("fullName")}
            placeholder="Ex. Awa Ndiaye"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={describeField("fullName")}
            {...register("fullName")}
          />
          <FieldError
            id={errorId("fullName")}
            message={getErrorMessage(errors, "fullName")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={fieldId("phone")}>Téléphone WhatsApp</Label>
          <Input
            id={fieldId("phone")}
            placeholder="Ex. +237 699 000 000"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describeField("phone")}
            {...register("phone")}
          />
          <FieldError
            id={errorId("phone")}
            message={getErrorMessage(errors, "phone")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={fieldId("email")}>Email</Label>
        <Input
          id={fieldId("email")}
          type="email"
          placeholder="Ex. awa@email.com"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describeField("email")}
          {...register("email")}
        />
        <FieldError
          id={errorId("email")}
          message={getErrorMessage(errors, "email")}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={fieldId("residenceCountry")}>
            Pays de résidence
          </Label>
          <Select
            id={fieldId("residenceCountry")}
            aria-invalid={Boolean(errors.residenceCountry)}
            aria-describedby={describeField("residenceCountry")}
            {...register("residenceCountry")}
          >
            <option value="">Sélectionner</option>
            {residenceCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError
            id={errorId("residenceCountry")}
            message={getErrorMessage(errors, "residenceCountry")}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={fieldId("destinationCountry")}>
            Pays d'étude visé
          </Label>
          <Select
            id={fieldId("destinationCountry")}
            aria-invalid={Boolean(errors.destinationCountry)}
            aria-describedby={describeField("destinationCountry")}
            {...register("destinationCountry")}
          >
            <option value="">Sélectionner</option>
            {destinationCountryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldError
            id={errorId("destinationCountry")}
            message={getErrorMessage(errors, "destinationCountry")}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={fieldId("requestedService")}>Service recherché</Label>
        <Select
          id={fieldId("requestedService")}
          aria-invalid={Boolean(errors.requestedService)}
          aria-describedby={describeField("requestedService")}
          {...register("requestedService")}
        >
          <option value="">Sélectionner</option>
          {requestedServiceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <FieldError
          id={errorId("requestedService")}
          message={getErrorMessage(errors, "requestedService")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={fieldId("message")}>Message optionnel</Label>
        <Textarea
          id={fieldId("message")}
          placeholder="Ajoutez une précision utile sur votre dossier."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={describeField("message")}
          {...register("message")}
        />
        <FieldError
          id={errorId("message")}
          message={getErrorMessage(errors, "message")}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-4">
          <input
            id={fieldId("consent")}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={describeField("consent")}
            {...register("consent")}
          />
          <Label
            htmlFor={fieldId("consent")}
            className="text-sm font-normal leading-6 text-muted-foreground"
          >
            J'accepte qu'AVI CERTIFY traite mes informations pour me recontacter
            au sujet de ma demande d'accompagnement.
          </Label>
        </div>
        <FieldError
          id={errorId("consent")}
          message={getErrorMessage(errors, "consent")}
        />
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        {isSubmitting ? "Préparation..." : "Recevoir un accompagnement"}
      </Button>
    </form>
  );
}
