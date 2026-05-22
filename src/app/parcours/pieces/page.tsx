import Image from "next/image";
import Link from "next/link";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Dépôt des pièces justificatives",
  description:
    "Déposez vos documents dans votre espace sécurisé : passeport, admission, justificatifs financiers et autres pièces nécessaires.",
  path: "/parcours/pieces",
});

export default function PiecesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 3 • Pièces justificatives"
        title="Déposez vos documents en toute sécurité"
        description="Chaque pièce est vérifiée par l'équipe pour garantir la conformité de votre dossier."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/passport-travel.jpg"
              alt="Documents de voyage et administratifs"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Documents généralement demandés</h2>
          <div className="space-y-3">
            {[
              "Passeport valide (copie lisible)",
              "Lettre d'admission de l'établissement",
              "Justificatifs d'identité et état civil",
              "Relevés de notes et diplômes",
              "Photos d'identité conformes",
              "Justificatifs financiers selon le service",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">Vérification systématique</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Chaque document est contrôlé pour éviter les rejets administratifs.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Button size="lg" variant="cta" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard">
                <Upload className="h-4 w-4" aria-hidden="true" />
                Accéder à mon espace
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
