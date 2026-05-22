import Link from "next/link";
import { ArrowRight, MessageCircle, FileText, Upload, CreditCard, CheckCircle, Plane } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Comment fonctionne l'accompagnement AVI CERTIFY",
  description:
    "Comprenez les étapes du suivi de dossier étudiant : qualification, création du dossier, documents, paiement, vérification et accompagnement.",
  path: "/comment-ca-marche",
});

const steps = [
  {
    number: 1,
    title: "Qualification du besoin",
    description: "Comprendre votre projet pour mieux vous accompagner",
    icon: MessageCircle,
    href: "/parcours/qualification",
  },
  {
    number: 2,
    title: "Création du dossier",
    description: "Votre espace personnel sécurisé",
    icon: FileText,
    href: "/parcours/dossier",
  },
  {
    number: 3,
    title: "Dépôt des pièces",
    description: "Déposez vos documents en toute sécurité",
    icon: Upload,
    href: "/parcours/pieces",
  },
  {
    number: 4,
    title: "Paiement sécurisé",
    description: "Réglez vos services dans un environnement protégé",
    icon: CreditCard,
    href: "/parcours/paiement",
  },
  {
    number: 5,
    title: "Vérification et émission",
    description: "Contrôle qualité et documents officiels",
    icon: CheckCircle,
    href: "/parcours/verification",
  },
  {
    number: 6,
    title: "Suivi jusqu'au départ",
    description: "Accompagnement jusqu'à votre installation",
    icon: Plane,
    href: "/parcours/depart",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Parcours"
        title="Un suivi simple, étape par étape"
        description="Le parcours AVI CERTIFY aide l'étudiant à savoir quoi faire, quand le faire et comment vérifier l'avancement du dossier."
      />
      <section className="container grid gap-6 py-12 md:grid-cols-2 lg:grid-cols-3 lg:py-16">
        {steps.map((step) => (
          <Link
            key={step.number}
            href={step.href}
            className="group relative overflow-hidden rounded-lg border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                  <step.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-accent">
                  Étape {step.number}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
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
