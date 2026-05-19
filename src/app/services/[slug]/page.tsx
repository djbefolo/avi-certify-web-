import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { getServiceBySlug, services } from "@/constants/services";
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
      <section className="container grid gap-8 py-12 md:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div className="rounded-md border bg-card p-5">
          <h2 className="text-xl font-semibold">Ce service inclut</h2>
          <ul className="mt-5 space-y-3 text-muted-foreground">
            <li>Analyse du besoin et du pays d'étude visé.</li>
            <li>Liste claire des informations et documents à préparer.</li>
            <li>Suivi humain jusqu'à la prochaine étape du dossier.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Objectif</h2>
          <p className="mt-4 leading-8 text-muted-foreground">
            AVI CERTIFY vous aide à identifier les pièces nécessaires, à
            structurer vos informations et à avancer avec un conseiller jusqu'à
            la validation de la prochaine étape.
          </p>
          <Button className="mt-8" asChild>
            <Link href="/contact">
              Demander un accompagnement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
