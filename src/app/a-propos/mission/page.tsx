"use client";

import Image from "next/image";
import { ArrowRight, Target, Users, Globe } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { AuthAwareLink } from "@/components/navigation/auth-aware-link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function MissionPage() {
  const { isAuthenticated } = useAuth();
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
              <AuthAwareLink
                authenticatedHref="/dashboard"
                unauthenticatedHref="/inscription"
              >
                {isAuthenticated ? "Accéder à mon espace" : "Créer mon espace étudiant"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AuthAwareLink>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
