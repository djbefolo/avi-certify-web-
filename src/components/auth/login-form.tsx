"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInWithEmail } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalytics } from "@/hooks/use-analytics";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Renseignez une adresse email valide.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Renseignez votre mot de passe."),
});

type LoginInput = z.input<typeof loginSchema>;
type LoginValues = z.output<typeof loginSchema>;

const defaultValues: LoginInput = {
  email: "",
  password: "",
};

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Connexion impossible pour le moment. Veuillez reessayer.";
  }

  if (
    error.message.includes("auth/invalid-credential") ||
    error.message.includes("auth/user-not-found") ||
    error.message.includes("auth/wrong-password")
  ) {
    return "Email ou mot de passe incorrect.";
  }

  if (error.message.includes("auth/too-many-requests")) {
    return "Trop de tentatives. Patientez quelques minutes avant de reessayer.";
  }

  return "Connexion impossible pour le moment. Veuillez reessayer.";
}

export function LoginForm() {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const { trackLoginCompleted } = useAnalytics();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: "onBlur",
  });

  const onSubmit: SubmitHandler<LoginInput> = async (input) => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setErrorMessage(null);

    try {
      const values: LoginValues = loginSchema.parse(input);
      const credential = await signInWithEmail(values.email, values.password);
      trackLoginCompleted();
      router.replace(
        credential.user.emailVerified ? "/dashboard" : "/verification-email",
      );
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
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
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
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
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="login-password">Mot de passe</Label>
          <Link
            href="/mot-de-passe-oublie"
            className="text-sm font-medium text-primary hover:underline"
          >
            Mot de passe oublie
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password?.message ? (
          <p className="text-sm font-medium text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-primary hover:underline">
          Creer un compte
        </Link>
      </p>
    </form>
  );
}
