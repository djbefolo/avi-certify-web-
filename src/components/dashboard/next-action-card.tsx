import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { DashboardSummary } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

type NextActionCardProps = {
  action: DashboardSummary["nextAction"];
};

export function NextActionCard({ action }: NextActionCardProps) {
  return (
    <article className="rounded-md border border-primary/20 bg-primary p-5 text-primary-foreground shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-medium text-primary-foreground/75">
            Prochaine action
          </p>
          <h2 className="mt-2 text-xl font-semibold">{action.title}</h2>
          <p className="mt-2 leading-7 text-primary-foreground/80">
            {action.description}
          </p>
        </div>
      </div>
      <Button className="mt-5" variant="secondary" asChild>
        <Link href={action.href}>
          {action.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </article>
  );
}
