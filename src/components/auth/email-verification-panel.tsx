"use client";

import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  LogOut,
  MailCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  runPostVerificationTransition,
  sendVerificationEmail,
} from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getPostAuthGuideRedirect } from "@/lib/resources/guide-intent.client";

type Feedback =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const resendCooldownSeconds = 60;

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible d'effectuer cette action pour le moment.";
}

export function EmailVerificationPanel() {
  const router = useRouter();
  const { user, loading, isEmailVerified, reloadUser, logout } = useAuth();
  const [feedback, setFeedback] = useState<Feedback>({ status: "idle" });
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const transitionRef = useRef<Promise<void> | null>(null);

  const finishVerification = useCallback(
    async (verifiedUser: User) => {
      if (!transitionRef.current) {
        transitionRef.current = runPostVerificationTransition(verifiedUser);
      }

      try {
        await transitionRef.current;
        router.replace(getPostAuthGuideRedirect("/dashboard"));
      } catch (error) {
        transitionRef.current = null;
        setFeedback({ status: "error", message: getErrorMessage(error) });
      }
    },
    [router],
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/connexion");
      return;
    }

    if (isEmailVerified) {
      setIsChecking(true);
      void finishVerification(user).finally(() => setIsChecking(false));
    }
  }, [finishVerification, isEmailVerified, loading, router, user]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [cooldown]);

  const handleResend = async () => {
    if (!user || cooldown > 0) {
      return;
    }

    setIsResending(true);
    setFeedback({ status: "idle" });

    try {
      await sendVerificationEmail(user);
      setCooldown(resendCooldownSeconds);
      setFeedback({
        status: "success",
        message: "Un nouvel email de verification vient d'etre envoye.",
      });
    } catch (error) {
      setFeedback({ status: "error", message: getErrorMessage(error) });
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) {
      router.replace("/connexion");
      return;
    }

    setIsChecking(true);
    setFeedback({ status: "idle" });

    try {
      const refreshedUser = await reloadUser();

      if (refreshedUser?.emailVerified) {
        await finishVerification(refreshedUser);
        return;
      }

      setFeedback({
        status: "error",
        message:
          "Votre adresse email n'est pas encore confirmee. Veuillez verifier votre boite mail avant de continuer.",
      });
    } catch (error) {
      setFeedback({ status: "error", message: getErrorMessage(error) });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/connexion");
  };

  if (
    loading ||
    !user ||
    (isEmailVerified && feedback.status !== "error")
  ) {
    return (
      <section className="container flex min-h-[48vh] items-center justify-center py-16">
        <div className="grid justify-items-center gap-4 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verification de votre session...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container flex justify-center py-12 lg:py-16">
      <div className="w-full max-w-2xl rounded-md border bg-background p-5 shadow-sm md:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          Verification email requise
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Nous vous avons envoye un email de verification. Veuillez confirmer
          votre adresse email avant d'acceder a votre espace AVI CERTIFY.
        </p>
        <p className="mt-3 leading-7 text-muted-foreground">
          Pour securiser votre espace AVI CERTIFY, veuillez confirmer votre
          adresse email. Vous pourrez acceder a votre espace une fois votre
          adresse confirmee.
        </p>
        <div className="mt-5 flex gap-3 rounded-md border bg-muted/25 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>
            Si vous ne voyez pas immédiatement notre email de vérification,
            pensez à vérifier votre dossier spam / courrier indésirable.
          </p>
        </div>

        {user.email ? (
          <div className="mt-5 rounded-md border bg-muted/25 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Adresse email
            </p>
            <p className="mt-1 break-all font-semibold">{user.email}</p>
          </div>
        ) : null}

        {feedback.status === "success" ? (
          <div
            className="mt-5 flex gap-3 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p>{feedback.message}</p>
          </div>
        ) : null}

        {feedback.status === "error" ? (
          <div
            className="mt-5 flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p>{feedback.message}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={isResending || cooldown > 0}
            aria-busy={isResending}
            onClick={handleResend}
          >
            {isResending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <MailCheck className="h-4 w-4" aria-hidden="true" />
            )}
            {cooldown > 0
              ? `Renvoyer dans ${cooldown}s`
              : "Renvoyer l'email de verification"}
          </Button>

          <Button
            type="button"
            disabled={isChecking}
            aria-busy={isChecking}
            onClick={handleCheckVerification}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            )}
            J'ai verifie mon email
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-4"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Se deconnecter
        </Button>
      </div>
    </section>
  );
}
