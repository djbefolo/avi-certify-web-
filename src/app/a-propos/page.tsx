import Link from "next/link";
import { ArrowRight, Target, Eye, Shield } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "À propos d'AVI CERTIFY",
  description:
    "Découvrez AVI CERTIFY, une plateforme d'accompagnement pour rendre les démarches AVI, documents financiers et visa étudiant plus lisibles.",
  path: "/a-propos",
});

export default function AboutPage() {
  const pillars = [
    {
      title: "Mission",
      text: "Simplifier les démarches financières et documentaires des étudiants qui préparent une mobilité internationale.",
      icon: Target,
      href: "/a-propos/mission",
    },
    {
      title: "Vision",
      text: "Créer une plateforme fiable où chaque étudiant peut suivre son dossier et comprendre les prochaines étapes.",
      icon: Eye,
      href: "/a-propos/vision",
    },
    {
      title: "Confiance",
      text: "Mettre l'accent sur la clarté, la conformité et la protection des informations sensibles.",
      icon: Shield,
      href: "/a-propos/confiance",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="À propos"
        title="AVI CERTIFY accompagne les étudiants dans les étapes sensibles de leur mobilité"
        description="Notre mission est de rendre les démarches financières, documentaires et visa plus lisibles pour les étudiants et leurs familles."
      />
      <section className="container grid gap-6 py-12 md:grid-cols-3 lg:py-16">
        {pillars.map((pillar) => (
          <Link
            key={pillar.title}
            href={pillar.href}
            className="group relative overflow-hidden rounded-lg border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                <pillar.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold">{pillar.title}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {pillar.text}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                En savoir plus
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
