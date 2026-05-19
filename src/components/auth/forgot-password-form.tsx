"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordReset } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Renseignez une adresse email valide.")
    .transform((value) => value.toLowerCase()),
});

type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;

const defaultValues: ForgotPasswordInput = {
  email: "",
};

function getResetErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Impossible d'envoyer l'email pour le moment. Veuillez reessayer.";
  }

  if (error.message.includes("auth/invalid-email")) {
    return "L'adresse email est invalide.";
  }

  if (error.message.includes("auth/too-many-requests")) {
    return "Trop de demandes. Patientez quelques minutes avant de reessayer.";
  }

  return "Impossible d'envoyer l'email pour le moment. Veuillez reessayer.";
}

export function ForgotPasswordForm() {
  const submitLockRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<ForgotPasswordInput> = async (input) => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const values: ForgotPasswordValues = forgotPasswordSchema.parse(input);

      await sendPasswordReset(values.email);
      reset(defaultValues);
      setSuccessMessage(
        "Si un compte existe avec cet email, un lien de reinitialisation vient d'etre envoye.",
      );
    } catch (error) {
      setErrorMessage(getResetErrorMessage(error));
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <form className="grid gap-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      {successMessage ? (
        <div
          className="flex gap-3 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p>{successMessage}</p>
        </div>
      ) : null}

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
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
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

      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Mail className="h-4 w-4" aria-hidden="true" />
        )}
        {isSubmitting ? "Envoi..." : "Recevoir un lien"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Vous avez retrouve votre acces ?{" "}
        <Link href="/connexion" className="font-medium text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
