import { PageHeader } from "@/components/marketing/page-header";
import { ServiceCard } from "@/components/marketing/service-card";
import { services } from "@/constants/services";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Services AVI, visa et accompagnement étudiant",
  description:
    "Découvrez les services AVI CERTIFY : preuve de fonds, AVI, transferts internationaux, frais de scolarité, hébergement, préfinancement et visa.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Un accompagnement complet pour préparer votre projet d'études."
        description="Nos services couvrent les besoins concrets d'un projet de mobilité : preuve de fonds, AVI, transferts internationaux, paiement de frais de scolarité, attestation de logement, préfinancement, visa et installation."
      />
      <section className="container grid gap-4 py-12 md:grid-cols-2 lg:grid-cols-4 lg:py-16">
        {services.map((service) => (
          <ServiceCard key={service.href} service={service} />
        ))}
      </section>
    </>
  );
}
