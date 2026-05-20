"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
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
import { useAnalytics } from "@/hooks/use-analytics";

const defaultValues: RegisterInput = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
};

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
      fullName: values.fullName,
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues,
    mode: "onBlur",
  });

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

      <div className="grid gap-2">
        <Label htmlFor="register-fullName">Nom complet</Label>
        <Input
          id="register-fullName"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
        {errors.fullName?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.fullName.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-phone">Telephone WhatsApp optionnel</Label>
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
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
