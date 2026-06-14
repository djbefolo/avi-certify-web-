"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPath = searchParams.get("next") || "/admin";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/admin/session/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          code?: string;
          error?: string;
        } | null;

        if (body?.code === "ADMIN_CLAIM_REQUIRED") {
          throw new Error("ADMIN_CLAIM_REQUIRED");
        }

        if (body?.code === "ADMIN_AUTH_CONFIG_UNAVAILABLE") {
          throw new Error("ADMIN_AUTH_CONFIG_UNAVAILABLE");
        }

        if (body?.code === "ADMIN_RECENT_AUTH_REQUIRED") {
          throw new Error("ADMIN_RECENT_AUTH_REQUIRED");
        }

        throw new Error("INVALID_ADMIN_CREDENTIALS");
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : "UNKNOWN_ADMIN_LOGIN_ERROR";

      if (message === "ADMIN_CLAIM_REQUIRED") {
        setError(
          "Compte authentifie, mais claim admin AVI CERTIFY manquant.",
        );
      } else if (message === "ADMIN_AUTH_CONFIG_UNAVAILABLE") {
        setError(
          "Service admin indisponible. Verifiez la configuration de session admin.",
        );
      } else if (message === "ADMIN_RECENT_AUTH_REQUIRED") {
        setError(
          "Authentification admin trop ancienne. Reconnectez-vous puis reessayez.",
        );
      } else {
        setError("Identifiants admin invalides ou session Firebase expiree.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl rounded-lg border border-white/15 bg-white/[0.08] p-8 shadow-2xl">
      <LockKeyhole
        className="h-10 w-10 text-[hsl(var(--institutional-yellow))]"
        aria-hidden="true"
      />
      <h1 className="mt-5 text-3xl font-semibold">Acces admin requis</h1>
      <p className="mt-4 leading-7 text-slate-200">
        Le backoffice fintech AVI CERTIFY est prive. La connexion production
        utilise Firebase Auth, des custom claims admin et une session serveur
        securisee.
      </p>

      <form onSubmit={onSubmit} className="mt-7 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="admin-email" className="text-white">
            Email admin
          </Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-white text-slate-950"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin-password" className="text-white">
            Mot de passe
          </Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="bg-white text-slate-950"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-md bg-red-500/15 p-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="cta" disabled={isSubmitting}>
          {isSubmitting ? "Verification..." : "Ouvrir la session admin"}
        </Button>
      </form>

      <div className="mt-5 rounded-md border border-white/15 bg-white/[0.06] p-4 text-sm text-slate-200">
        <p className="font-semibold text-white">2FA TOTP preparee</p>
        <p className="mt-1">
          L'architecture reserve un second facteur TOTP pour Google
          Authenticator, Microsoft Authenticator ou Authy. Aucun SMS.
        </p>
      </div>
    </div>
  );
}
