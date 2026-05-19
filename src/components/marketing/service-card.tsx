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
      className="group rounded-md border bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-full min-h-56 flex-col">
        <p className="text-sm font-semibold text-accent">{service.kicker}</p>
        <h3 className="mt-3 text-xl font-semibold">{service.title}</h3>
        <p className="mt-3 leading-7 text-muted-foreground">
          {service.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-primary">
          En savoir plus
          <ArrowRight
            className="h-4 w-4 transition group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
