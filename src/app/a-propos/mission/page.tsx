import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Target, Users, Globe } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Notre mission",
  description:
    "Simplifier les démarches financières et documentaires des étudiants qui préparent une mobilité internationale.",
  path: "/a-propos/mission",
});

export default function MissionPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mission"
        title="Simplifier la mobilité étudiante internationale"
        description="Rendre les démarches administratives et financières plus claires, plus accessibles et moins stressantes."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/student-meetup-avi-certify-services.png"
              alt="Réunion d'information étudiante AVI CERTIFY"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Pourquoi AVI CERTIFY existe</h2>
          <p className="leading-relaxed text-muted-foreground">
            Chaque année, des milliers d'étudiants africains préparent leur mobilité vers l'Europe. Les démarches administratives, financières et documentaires sont souvent complexes, opaques et sources de stress.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            AVI CERTIFY a été créé pour rendre ce parcours plus clair : structurer les informations, accompagner les familles et garantir la conformité des dossiers.
          </p>

          <div className="space-y-4">
            {[
              { icon: Target, title: "Clarté", text: "Chaque étape est expliquée et suivie" },
              { icon: Users, title: "Accompagnement humain", text: "Une équipe disponible et à l'écoute" },
              { icon: Globe, title: "Mobilité facilitée", text: "De l'Afrique vers l'Europe avec sérénité" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
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

          <div className="mt-8">
            <Button size="lg" variant="cta" asChild>
              <Link href="/contact">
                Commencer mon dossier
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
