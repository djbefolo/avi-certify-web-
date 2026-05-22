import { Check, Circle, Dot } from "lucide-react";
import type { TimelineStep } from "@/types/application";
import { cn } from "@/lib/utils";

type ApplicationTimelineProps = {
  steps: TimelineStep[];
};

function StepIcon({ status }: { status: TimelineStep["status"] }) {
  if (status === "completed") {
    return <Check className="h-4 w-4" aria-hidden="true" />;
  }

  if (status === "current") {
    return <Dot className="h-5 w-5" aria-hidden="true" />;
  }

  return <Circle className="h-4 w-4" aria-hidden="true" />;
}

export function ApplicationTimeline({ steps }: ApplicationTimelineProps) {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Parcours</p>
        <h2 className="mt-2 text-xl font-semibold">Avancement du dossier</h2>
      </div>

      <ol className="mt-6 grid gap-4">
        {steps.map((step) => (
          <li key={step.id} className="grid grid-cols-[2rem_1fr] gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border",
                step.status === "completed" &&
                  "border-accent/30 bg-accent/10 text-accent",
                step.status === "current" &&
                  "border-primary/30 bg-primary/10 text-primary",
                step.status === "upcoming" &&
                  "border-input bg-muted/30 text-muted-foreground",
              )}
            >
              <StepIcon status={step.status} />
            </span>
            <div className="pb-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold">{step.title}</h3>
                {step.dateLabel ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {step.dateLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
