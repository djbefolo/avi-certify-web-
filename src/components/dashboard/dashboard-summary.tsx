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
      label: "Documents recus",
      value: `${
        summary.documents.filter(
          (document) =>
            document.status === "pending_review" ||
            document.status === "approved",
        ).length
      }/${summary.documents.length}`,
      icon: FileCheck2,
    },
  ];

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <FolderKanban className="h-4 w-4 text-primary" aria-hidden="true" />
            {summary.applicationStatusLabel}
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            Centre de controle de votre mobilite
          </h2>
          <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
            Votre dossier est actuellement a l'etape{" "}
            <span className="font-medium text-foreground">{summary.currentStep}</span>.
          </p>
        </div>
        <Button className="shrink-0" asChild>
          <Link href={summary.nextAction.href}>
            {summary.nextAction.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-md border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </p>
              <metric.icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-normal">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
