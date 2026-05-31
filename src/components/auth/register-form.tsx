"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendVerificationEmail, signUpWithEmail } from "@/lib/firebase/auth";
import {
  registerSchema,
  type RegisterInput,
  type RegisterValues,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useAnalytics } from "@/hooks/use-analytics";
import { birthCountryOptions } from "@/lib/profile/countries";
import { rememberGuideIntent } from "@/lib/resources/guide-intent.client";
import {
  GUIDE_FRANCE_2026_RESOURCE_ID,
  isGuideFrance2026Resource,
} from "@/lib/resources/guide-resource";

const defaultValues: RegisterInput = {
  firstName: "",
  lastName: "",
  birthDate: "",
  birthCountry: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const passwordRules = [
  { label: "8 caractères minimum", test: (value: string) => value.length >= 8 },
  { label: "une majuscule", test: (value: string) => /[A-Z]/.test(value) },
  { label: "une minuscule", test: (value: string) => /[a-z]/.test(value) },
  { label: "un chiffre", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "un caractère spécial",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

type CreateProfileResponse = {
  error?: string;
};

function getRegisterErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Creation du compte impossible pour le moment. Veuillez reessayer.";
  }

  if (error.message.includes("auth/email-already-in-use")) {
    return "Un compte existe deja avec cette adresse email.";
  }

  if (error.message.includes("auth/weak-password")) {
    return "Choisissez un mot de passe plus robuste.";
  }

  if (error.message.includes("auth/invalid-email")) {
    return "L'adresse email est invalide.";
  }

  return error.message || "Creation du compte impossible pour le moment.";
}

async function createProfile(values: RegisterValues, token: string) {
  const response = await fetch("/api/users/create-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate,
      birthCountry: values.birthCountry,
      phone: values.phone,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | CreateProfileResponse
      | null;

    throw new Error(
      payload?.error ??
        "Le compte est cree, mais le profil n'a pas pu etre initialise.",
    );
  }
}

export function RegisterForm() {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const { trackSignupCompleted, trackSignupStarted } = useAnalytics();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resource, setResource] = useState<string | null>(null);
  const loginHref = isGuideFrance2026Resource(resource)
    ? `/connexion?resource=${GUIDE_FRANCE_2026_RESOURCE_ID}`
    : "/connexion";

  useEffect(() => {
    const currentResource = new URLSearchParams(window.location.search).get(
      "resource",
    );
    setResource(currentResource);
    rememberGuideIntent(currentResource);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues,
    mode: "onBlur",
  });
  const passwordValue = watch("password") ?? "";

  const onSubmit: SubmitHandler<RegisterInput> = async (input) => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setErrorMessage(null);

    try {
      const values = registerSchema.parse(input);
      trackSignupStarted();
      const credential = await signUpWithEmail(values.email, values.password);
      const token = await credential.user.getIdToken();

      await createProfile(values, token);
      await sendVerificationEmail(credential.user).catch((verificationError) => {
        console.warn(
          "[auth/register] Failed to send verification email.",
          verificationError,
        );
      });
      trackSignupCompleted();
      router.replace("/verification-email");
    } catch (error) {
      setErrorMessage(getRegisterErrorMessage(error));
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      {errorMessage ? (
        <div
          className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="register-firstName">Prénom</Label>
          <Input
            id="register-firstName"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            {...register("firstName")}
          />
          {errors.firstName?.message ? (
            <p className="text-sm font-medium text-destructive">
              {errors.firstName.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-lastName">Nom</Label>
          <Input
            id="register-lastName"
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            {...register("lastName")}
          />
          {errors.lastName?.message ? (
            <p className="text-sm font-medium text-destructive">
              {errors.lastName.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="register-birthDate">Date de naissance</Label>
          <div className="relative">
            <Input
              id="register-birthDate"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              className="pr-10"
              aria-invalid={Boolean(errors.birthDate)}
              {...register("birthDate")}
            />
            <CalendarDays
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          {errors.birthDate?.message ? (
            <p className="text-sm font-medium text-destructive">
              {errors.birthDate.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-birthCountry">Pays de naissance</Label>
          <Select
            id="register-birthCountry"
            autoComplete="country-name"
            aria-invalid={Boolean(errors.birthCountry)}
            {...register("birthCountry")}
          >
            <option value="">Sélectionner un pays</option>
            {birthCountryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
          {errors.birthCountry?.message ? (
            <p className="text-sm font-medium text-destructive">
              {errors.birthCountry.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-phone">Téléphone WhatsApp (optionnel)</Label>
        <Input
          id="register-phone"
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={Boolean(errors.phone)}
          {...register("phone")}
        />
        {errors.phone?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.phone.message}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Utile pour un accompagnement plus rapide.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-password">Mot de passe</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.password.message}
          </p>
        ) : null}
        <div className="rounded-md border bg-muted/20 p-3 text-sm">
          <p className="font-medium text-foreground">
            Votre mot de passe doit contenir :
          </p>
          <ul className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
            {passwordRules.map((rule) => {
              const isValid = rule.test(passwordValue);

              return (
                <li key={rule.label} className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      isValid ? "text-accent" : "text-muted-foreground/45"
                    }`}
                    aria-hidden="true"
                  />
                  <span className={isValid ? "text-foreground" : undefined}>
                    {rule.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-confirmPassword">
          Confirmer le mot de passe
        </Label>
        <Input
          id="register-confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        )}
        {isSubmitting ? "Creation..." : "Creer mon compte"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Deja un compte ?{" "}
        <Link href={loginHref} className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
