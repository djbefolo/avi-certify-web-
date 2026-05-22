import { CheckCircle2, CircleDashed } from "lucide-react";
import type { ApplicationStatus } from "@/types/application";
import { getApplicationStatusLabel, getStatusClassName } from "@/components/dashboard/status-styles";
import { cn } from "@/lib/utils";

type DossierStatusCardProps = {
  status: ApplicationStatus;
  currentStep: string;
  completionPercent: number;
  advisorName: string;
};

export function DossierStatusCard({
  status,
  currentStep,
  completionPercent,
  advisorName,
}: DossierStatusCardProps) {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Etat du dossier</p>
          <h2 className="mt-2 text-xl font-semibold">{currentStep}</h2>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
            getStatusClassName(status),
          )}
        >
          {getApplicationStatusLabel(status)}
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-semibold">{completionPercent}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-sm">
        <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
          <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
          <span>Profil client initialise</span>
        </div>
        <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
          <CircleDashed className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Conseiller : {advisorName}</span>
        </div>
      </div>
    </article>
  );
}
