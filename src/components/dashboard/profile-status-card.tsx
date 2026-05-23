import { UserRound } from "lucide-react";
import Link from "next/link";
import type { DashboardSummary } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

type ProfileStatusCardProps = {
  profile: DashboardSummary["profile"];
};

function getProfileStatusLabel(profile: DashboardSummary["profile"]) {
  if (profile.completionState === "complete") {
    return "Complet";
  }

  if (profile.completionState === "partial") {
    return "En cours";
  }

  return "À compléter";
}

export function ProfileStatusCard({ profile }: ProfileStatusCardProps) {
  const isComplete = profile.completionState === "complete";

  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Profil étudiant
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            {getProfileStatusLabel(profile)}
          </h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Complétude</span>
          <span className="font-semibold">{profile.completionPercent} %</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-accent"
            style={{ width: `${profile.completionPercent}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {isComplete
          ? "Vos informations principales sont prêtes pour le traitement du dossier."
          : "Certaines informations restent nécessaires pour sécuriser les documents et attestations."}
      </p>

      <Button className="mt-5" variant={isComplete ? "outline" : "default"} asChild>
        <Link href="/profil">
          {isComplete ? "Modifier mes informations" : "Compléter mon profil"}
        </Link>
      </Button>
    </article>
  );
}
