import { GraduationCap, MapPin, UserRound } from "lucide-react";
import type { StudentProfile } from "@/types/student-profile";
import {
  admissionStatusOptions,
  binaryChoiceOptions,
  financialNeedTypeOptions,
  getSelectedServiceLabel,
  housingNeedOptions,
} from "@/lib/profile/student-profile";

type StudentSummaryCardProps = {
  profile: StudentProfile | null;
};

function text(value: string | number | null | undefined) {
  return value === null || value === undefined || value === ""
    ? "A renseigner"
    : String(value);
}

function optionLabel<T extends string>(
  value: T | null | undefined,
  options: { value: T; label: string }[],
) {
  return value ? options.find((option) => option.value === value)?.label ?? value : null;
}

function money(value: number | null) {
  if (!value || value <= 0) {
    return "A renseigner";
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function StudentSummaryCard({ profile }: StudentSummaryCardProps) {
  const financingLabel =
    optionLabel(profile?.needsFinancing, binaryChoiceOptions) ??
    optionLabel(profile?.financialNeedType, financialNeedTypeOptions);

  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Profil client
          </p>
          <h2 className="mt-2 text-xl font-semibold">Résumé étudiant</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-5 grid gap-5">
        <section className="grid gap-3 rounded-md border bg-muted/15 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
            Identité
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryRow label="Nom" value={text(profile?.fullName)} />
            <SummaryRow label="Nationalité" value={text(profile?.nationality)} />
            <SummaryRow
              label="Résidence"
              value={text(profile?.countryOfResidence)}
            />
          </div>
        </section>

        <section className="grid gap-3 rounded-md border bg-muted/15 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Projet
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryRow
              label="Destination"
              value={text(profile?.destinationCountry)}
            />
            <SummaryRow label="Ville" value={text(profile?.destinationCity)} />
            <SummaryRow label="École" value={text(profile?.targetSchoolName)} />
            <SummaryRow
              label="Admission"
              value={text(
                optionLabel(profile?.admissionStatus, admissionStatusOptions),
              )}
            />
          </div>
        </section>

        <section className="grid gap-3 rounded-md border bg-muted/15 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
            Services
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryRow
              label="Service"
              value={getSelectedServiceLabel(profile?.selectedService ?? null)}
            />
            <SummaryRow label="AVI estimé" value={money(profile?.requestedAviAmount ?? null)} />
            <SummaryRow
              label="Logement"
              value={text(optionLabel(profile?.housingNeed, housingNeedOptions))}
            />
            <SummaryRow
              label="Financement"
              value={text(financingLabel)}
            />
          </div>
        </section>
      </div>
    </article>
  );
}
