"use client";

import { CalendarDays, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import {
  getUserProfileSummary,
  type UserProfileSummary,
} from "@/lib/dashboard/dashboard-data.service";

function getDateLabel(date: Date | null) {
  if (!date) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

export default function ProfilPage() {
  const { user, isEmailVerified } = useAuth();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user || !isEmailVerified) {
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setErrorMessage(null);

      try {
        const nextProfile = await getUserProfileSummary(user.uid);

        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Impossible de charger le profil pour le moment.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isEmailVerified, user]);

  const email = profile?.email ?? user?.email ?? "Non renseigne";
  const uid = profile?.uid ?? user?.uid ?? "Non disponible";

  return (
    <DashboardLayout
      title="Profil"
      description="Consultez les informations rattachees a votre compte AVI CERTIFY."
    >
      <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
              <UserRound className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Informations utilisateur</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Ces donnees proviennent du profil Firestore users/[uid] lorsqu'il
              existe, avec Firebase Auth en secours pour l'email et l'identifiant.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Compte actif
          </span>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {loadingProfile ? (
          <p className="mt-5 rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
            Chargement du profil...
          </p>
        ) : null}

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Nom complet
            </dt>
            <dd className="mt-2 break-all font-semibold">
              {profile?.fullName ?? "Non renseigne"}
            </dd>
          </div>
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </dt>
            <dd className="mt-2 break-all font-semibold">{email}</dd>
          </div>
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="text-sm font-medium text-muted-foreground">
              Identifiant Firebase
            </dt>
            <dd className="mt-2 break-all font-semibold">{uid}</dd>
          </div>
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="text-sm font-medium text-muted-foreground">Role</dt>
            <dd className="mt-2 break-all font-semibold">
              {profile?.role ?? "Non renseigne"}
            </dd>
          </div>
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Cree le
            </dt>
            <dd className="mt-2 break-all font-semibold">
              {getDateLabel(profile?.createdAt ?? null)}
            </dd>
          </div>
        </dl>
      </section>
    </DashboardLayout>
  );
}
