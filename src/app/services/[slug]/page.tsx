import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MessageCircle, ShieldCheck, Tag } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { AuthAwareLink } from "@/components/navigation/auth-aware-link";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getServiceBySlug, serviceGuaranteeText, services } from "@/constants/services";
import { createPageMetadata } from "@/lib/seo/metadata";
import { serviceJsonLd } from "@/lib/seo/schema";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {};
  }

  return createPageMetadata({
    title: service.title,
    description: service.description,
    path: service.href,
  });
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <>
      <JsonLd data={serviceJsonLd(service)} />
      <PageHeader
        eyebrow={service.kicker}
        title={service.title}
        description={service.description}
      />

      <section className="container grid gap-4 py-8 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-4">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tarif
            </p>
            <p className="mt-1 font-semibold">{service.priceLabel}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Délai
            </p>
            <p className="mt-1 font-semibold">{service.delay}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-md border border-accent/25 bg-accent/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Garantie
            </p>
            <p className="mt-1 font-semibold">Remboursement sous 24h si refus de visa</p>
          </div>
        </div>
      </section>

      <section className="container grid gap-8 py-4 md:grid-cols-[0.8fr_1.2fr] lg:py-12">
        <div className="rounded-md border bg-card p-5">
          <h2 className="text-xl font-semibold">Ce service inclut</h2>
          <ul className="mt-5 space-y-3 text-muted-foreground">
            {service.detail.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">{service.detail.objectiveTitle}</h2>
          <p className="mt-4 leading-8 text-muted-foreground">
            {service.detail.objective}
          </p>
          <p className="mt-4 rounded-md border border-accent/20 bg-accent/5 p-4 text-sm leading-6 text-muted-foreground">
            {serviceGuaranteeText}{" "}
            <Link href="/prix#garantie-remboursement" className="font-medium text-accent hover:underline">
              Voir la garantie
            </Link>
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {service.detail.ctaKind === "transactional" ? (
              <Button asChild>
                <AuthAwareLink
                  unauthenticatedHref="/inscription"
                  authenticatedHref="/dossier/paiement"
                >
                  {service.detail.ctaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </AuthAwareLink>
              </Button>
            ) : (
              <Button asChild>
                <a
                  href="https://wa.me/message/XOKRBYI3ZEQBM1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {service.detail.ctaLabel}
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/faq">Voir les questions fréquentes</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
