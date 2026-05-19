import { ArrowRight, FileCheck2, FolderKanban, Gauge, MapPin } from "lucide-react";
import Link from "next/link";
import type { DashboardSummary as DashboardSummaryType } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

type DashboardSummaryProps = {
  summary: DashboardSummaryType;
};

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const metrics = [
    {
      label: "Progression",
      value: `${summary.completionPercent}%`,
      icon: Gauge,
    },
    {
      label: "Destination",
      value: summary.destinationCountry,
      icon: MapPin,
    },
    {
      label: "Documents",
      value: `${summary.documents.filter((document) => document.status === "approved").length}/${summary.documents.length}`,
      icon: FileCheck2,
    },
  ];

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
            {summary.applicationStatusLabel}
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            Bienvenue dans votre espace AVI CERTIFY
          </h2>
          <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
            Votre dossier est actuellement a l'etape :{" "}
            <span className="font-medium text-foreground">{summary.currentStep}</span>.
          </p>
        </div>
        <Button asChild>
          <Link href={summary.nextAction.href}>
            {summary.nextAction.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-muted/25 p-4">
            <metric.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
