import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { LeadFormSection } from "@/components/marketing/lead-form-section";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ServiceCard } from "@/components/marketing/service-card";
import { TrustBanner } from "@/components/marketing/trust-banner";
import { Button } from "@/components/ui/button";
import { services } from "@/constants/services";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "AVI étudiant, visa et dossier financier",
  description:
    "Préparez votre AVI étudiant, votre attestation d'hébergement, votre préfinancement et votre dossier de visa avec un accompagnement structuré.",
  path: "/",
});

const processSteps = [
  "Créez votre dossier",
  "Déposez vos informations",
  "Payez ou planifiez votre dépôt",
  "Recevez vos documents",
  "Suivez votre départ",
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-muted/40">
        <div className="container grid gap-10 py-12 md:grid-cols-[1.08fr_0.92fr] md:items-center md:py-20 lg:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              Accompagnement étudiant structuré et sécurisé
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-normal text-foreground sm:text-5xl lg:text-6xl">
              Construisez votre projet d'études internationales avec un
              accompagnement financier et documentaire structuré, sécurisé et
              vérifiable.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              AVI, attestation d'hébergement, préfinancement et accompagnement
              visa : AVI CERTIFY accompagne les étudiants d'Afrique francophone
              avec des documents vérifiables et un espace client sécurisé.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="cta" asChild>
                <TrackedCtaLink
                  href="/contact"
                  analyticsLocation="home_hero"
                  analyticsLabel="Commencer mon dossier"
                >
                  Commencer mon dossier
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </TrackedCtaLink>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <TrackedCtaLink
                  href="/services"
                  analyticsLocation="home_hero"
                  analyticsLabel="Voir les services"
                >
                  Voir les services
                </TrackedCtaLink>
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              {[
                ["Présence", "Canada, France, Cameroun"],
                ["Parcours", "Suivi étape par étape"],
                ["Objectif", "Dossier clair et vérifiable"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border bg-background p-4">
                  <dt className="font-medium text-muted-foreground">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-md border bg-background p-4 shadow-sm">
            <div className="rounded-md border bg-muted/35 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aperçu dossier
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    AVI étudiant
                  </h2>
                </div>
                <BadgeCheck className="h-8 w-8 text-accent" aria-hidden="true" />
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ["Profil", "Informations reçues", "complete"],
                  ["Documents", "Passeport et admission", "progress"],
                  ["Paiement", "En attente de validation", "pending"],
                ].map(([title, detail, state]) => (
                  <div
                    key={title}
                    className="flex items-center justify-between gap-4 rounded-md border bg-background p-4"
                  >
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{detail}</p>
                    </div>
                    <span
                      className={
                        state === "complete"
                          ? "h-3 w-3 rounded-full bg-accent"
                          : state === "progress"
                            ? "h-3 w-3 rounded-full bg-primary"
                            : "h-3 w-3 rounded-full bg-amber-500"
                      }
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustBanner />

      <section className="container py-14 md:py-20">
        <SectionHeading
          eyebrow="Services"
          title="Les démarches essentielles, organisées au même endroit."
          description="Choisissez le service adapté à votre projet d'études et avancez avec un parcours clair, documenté et suivi."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.href} service={service} />
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/55">
        <div className="container grid gap-10 py-14 md:grid-cols-[0.85fr_1.15fr] md:items-start md:py-20">
          <SectionHeading
            eyebrow="Méthode"
            title="Un parcours lisible pour l'étudiant et pour l'équipe."
            description="Vous savez quelles informations fournir, où en est votre dossier et quelle est la prochaine action attendue."
          />
          <div className="grid gap-3">
            {processSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-md border bg-background p-4"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container grid gap-8 py-14 md:grid-cols-3 md:py-20">
        {[
          {
            icon: FileCheck2,
            title: "Dossier clarifié",
            text: "Les informations importantes sont structurées pour limiter les oublis et accélérer le traitement.",
          },
          {
            icon: Building2,
            title: "Présence internationale",
            text: "Un accompagnement pensé pour les étudiants d'Afrique francophone visant l'Europe.",
          },
          {
            icon: ShieldCheck,
            title: "Sécurité documentaire",
            text: "Les pièces sensibles seront déposées dans un espace client protégé et contrôlé.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-md border p-5">
            <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
            <p className="mt-2 leading-7 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      <LeadFormSection />
    </>
  );
}
