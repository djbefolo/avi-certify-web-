"use client";

import Image from "next/image";
import { ArrowRight, Lightbulb, Shield, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { AuthAwareLink } from "@/components/navigation/auth-aware-link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function VisionPage() {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <PageHeader
        eyebrow="Vision"
        title="Une plateforme de confiance pour la mobilité internationale"
        description="Donner aux étudiants et à leurs familles les outils pour naviguer sereinement dans leurs démarches."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Ce vers quoi nous tendons</h2>
          <p className="leading-relaxed text-muted-foreground">
            AVI CERTIFY vise à devenir la référence pour l'accompagnement documentaire et financier des étudiants en mobilité internationale.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Notre vision : une plateforme où chaque étudiant sait exactement où il en est, ce qu'il doit faire, et dispose d'un suivi transparent jusqu'à son arrivée.
          </p>

          <div className="space-y-4">
            {[
              { icon: Lightbulb, title: "Innovation", text: "Simplifier l'expérience grâce au numérique" },
              { icon: Shield, title: "Sécurité", text: "Protéger les données sensibles des étudiants" },
              { icon: Smartphone, title: "Accessibilité", text: "Disponible partout, à tout moment" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
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
                authenticatedHref="/dossier"
                unauthenticatedHref="/services"
              >
                {isAuthenticated ? "Continuer mon dossier" : "Découvrir nos services"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AuthAwareLink>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/sorbonne-univertsity-beautifull.jpg.jpg"
              alt="Université Sorbonne - Excellence académique"
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
