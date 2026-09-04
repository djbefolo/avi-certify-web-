import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/constants/services";

type ServiceCardProps = {
  service: Service;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={service.href}
      className="group relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-full min-h-64 flex-col p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center justify-center self-start rounded-md bg-accent/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            {service.kicker}
          </span>
          <span className="text-sm font-semibold text-primary">
            {service.priceLabel}
          </span>
        </div>
        <h3 className="text-xl font-semibold leading-tight">{service.title}</h3>
        <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
          {service.description}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          {service.detail.ctaLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
