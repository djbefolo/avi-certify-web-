import Image from "next/image";
import Link from "next/link";
import { Plane, MapPin, MessageCircle, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Préparation du départ",
  description:
    "Accompagnement jusqu'au départ : orientation, accueil et suivi de votre installation dans votre pays d'accueil.",
  path: "/parcours/depart",
});

export default function DepartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 6 • Départ"
        title="Accompagnement jusqu'à l'arrivée"
        description="Le dossier administratif est finalisé. Nous restons disponibles pour votre installation."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Suivi de votre installation</h2>
          <p className="leading-relaxed text-muted-foreground">
            L'accompagnement ne s'arrête pas à l'obtention du visa. Nous restons présents pour faciliter vos premiers pas.
          </p>
          <div className="space-y-4">
            {[
              { icon: Plane, title: "Préparation du voyage", text: "Conseils logistiques et dernières vérifications" },
              { icon: MapPin, title: "Accueil et orientation", text: "Informations pratiques sur votre ville d'accueil" },
              { icon: HeartHandshake, title: "Suivi post-arrivée", text: "Support durant vos premières semaines" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Button size="lg" variant="cta" className="w-full sm:w-auto" asChild>
              <a
                href="https://wa.me/message/XOKRBYI3ZEQBM1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Rester en contact
              </a>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/tour-effel-paris-welcome-france.jpg"
              alt="Arrivée en France - Tour Eiffel"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container py-12 text-center lg:py-16">
          <h2 className="text-2xl font-semibold">Votre projet prend vie</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            De la qualification initiale à l'arrivée dans votre pays d'accueil, AVI CERTIFY vous accompagne avec rigueur et humanité.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="cta" asChild>
              <Link href="/contact">
                Démarrer mon parcours
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
