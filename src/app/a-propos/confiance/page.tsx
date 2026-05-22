import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, FileCheck, Lock, Scale } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Confiance et conformité",
  description:
    "Mettre l'accent sur la clarté, la conformité et la protection des informations sensibles.",
  path: "/a-propos/confiance",
});

export default function ConfiancePage() {
  return (
    <>
      <PageHeader
        eyebrow="Confiance"
        title="Clarté, conformité et protection des données"
        description="La confiance se construit sur la transparence, la conformité réglementaire et la sécurité des informations."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/partners-bank-rbc.jpg"
              alt="Environnement bancaire et financier"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Les piliers de notre confiance</h2>
          <div className="space-y-4">
            {[
              {
                icon: Building2,
                title: "Société immatriculée",
                text: "RCS Besançon 942 370 545 • ORIAS 25005516",
              },
              {
                icon: FileCheck,
                title: "Documents vérifiables",
                text: "Attestations certifiées et traçables",
              },
              {
                icon: Lock,
                title: "Données protégées",
                text: "Chiffrement et conformité RGPD",
              },
              {
                icon: Scale,
                title: "Conformité réglementaire",
                text: "Code Monétaire et Financier français",
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <Button size="lg" variant="cta" asChild>
              <Link href="/contact">
                Commencer en confiance
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <div className="flex gap-4 text-sm">
              <a
                href="https://www.orias.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Vérifier sur ORIAS
              </a>
              <a
                href="https://acpr.banque-france.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                En savoir plus sur l'ACPR
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
