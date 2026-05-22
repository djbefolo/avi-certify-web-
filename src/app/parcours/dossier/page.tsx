import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Shield, Clock } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Création de votre dossier",
  description:
    "Créez votre espace sécurisé et commencez à structurer votre dossier avec l'accompagnement de l'équipe AVI CERTIFY.",
  path: "/parcours/dossier",
});

export default function DossierPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 2 • Dossier"
        title="Votre espace personnel sécurisé"
        description="Créez votre compte et accédez à un tableau de bord où suivre chaque étape de votre parcours."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Un espace conçu pour la clarté</h2>
          <p className="leading-relaxed text-muted-foreground">
            Votre dashboard centralise toutes les informations : documents demandés, statut du dossier, paiements, et prochaines actions attendues.
          </p>
          <div className="space-y-4">
            {[
              { icon: FileText, title: "Suivi en temps réel", text: "Visualisez l'avancement de chaque étape" },
              { icon: Shield, title: "Données protégées", text: "Espace chiffré et authentifié" },
              { icon: Clock, title: "Historique complet", text: "Accès à tous vos échanges et documents" },
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

          <div className="mt-8 space-y-4">
            <Button size="lg" variant="cta" className="w-full sm:w-auto" asChild>
              <Link href="/inscription">
                Créer mon compte
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/connexion">
                J'ai déjà un compte
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/fill-form-student-visa.jpg"
              alt="Interface de suivi de dossier étudiant"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>
    </>
  );
}
