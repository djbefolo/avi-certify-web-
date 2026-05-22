import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileCheck, UserCheck, Mail } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Vérification et émission",
  description:
    "L'équipe vérifie votre dossier, prépare vos documents officiels et vous accompagne jusqu'à leur réception.",
  path: "/parcours/verification",
});

export default function VerificationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 5 • Vérification"
        title="Contrôle qualité et émission"
        description="Chaque dossier est vérifié par l'équipe avant l'émission des documents officiels."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/obtain-visa-student.jpg"
              alt="Vérification de documents administratifs"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Ce qui est vérifié</h2>
          <div className="space-y-4">
            {[
              { icon: FileCheck, title: "Cohérence documentaire", text: "Tous les documents sont croisés pour garantir la cohérence du dossier" },
              { icon: UserCheck, title: "Conformité réglementaire", text: "Respect des exigences Campus France et consulaires" },
              { icon: Mail, title: "Documents officiels", text: "Émission des attestations certifiées et vérifiables" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="font-semibold text-accent-dark">Délai moyen</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les documents sont généralement émis sous 48 à 72h ouvrées après validation complète du dossier.
            </p>
          </div>

          <div className="mt-8">
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/parcours/depart">
                Découvrir la suite
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
