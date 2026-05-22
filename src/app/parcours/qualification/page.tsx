import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Qualification de votre besoin",
  description:
    "Première étape : comprendre votre projet d'études, votre parcours et identifier les services adaptés à votre situation.",
  path: "/parcours/qualification",
});

export default function QualificationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 1 • Qualification"
        title="Comprendre votre projet pour mieux vous accompagner"
        description="Chaque parcours est unique. Nous prenons le temps d'identifier vos besoins précis avant de démarrer."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/customer-service-avi-certify.jpg"
              alt="Échange avec un conseiller AVI CERTIFY"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Ce que nous qualifions ensemble</h2>
          <div className="space-y-4">
            {[
              "Votre destination et établissement d'accueil",
              "Votre situation administrative actuelle",
              "Les documents financiers nécessaires (AVI, préfinancement)",
              "Le calendrier Campus France et consulaire",
              "Les démarches d'hébergement et d'installation",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <Button size="lg" variant="cta" className="w-full sm:w-auto" asChild>
              <Link href="/contact">
                Commencer mon dossier
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a
                href="https://wa.me/message/XOKRBYI3ZEQBM1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Discuter avec un conseiller
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-12 lg:py-16">
          <h2 className="text-center text-2xl font-semibold">Après la qualification</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Une fois votre besoin compris, nous créons votre dossier personnalisé et vous guidons vers les prochaines étapes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/parcours/dossier">
                Découvrir l'étape suivante
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
