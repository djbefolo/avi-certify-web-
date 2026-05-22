import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CreditCard, Shield, Clock } from "lucide-react";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Paiement sécurisé",
  description:
    "Réglez vos services via un paiement sécurisé Stripe. Paiement immédiat ou planification selon votre situation.",
  path: "/parcours/paiement",
});

export default function PaiementPage() {
  return (
    <>
      <PageHeader
        eyebrow="Étape 4 • Paiement"
        title="Paiement sécurisé et flexible"
        description="Réglez vos frais de service dans un environnement sécurisé conforme PCI-DSS."
      />

      <section className="container grid gap-12 py-12 md:grid-cols-2 md:items-center lg:py-16">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Paiement protégé par Stripe</h2>
          <p className="leading-relaxed text-muted-foreground">
            Tous les paiements sont traités via Stripe, leader mondial de la sécurité des transactions en ligne.
          </p>
          <div className="space-y-4">
            {[
              { icon: Shield, title: "Sécurité maximale", text: "Conformité PCI-DSS niveau 1" },
              { icon: CreditCard, title: "Moyens acceptés", text: "Cartes bancaires internationales" },
              { icon: Clock, title: "Paiement frais admission", text: "Traitement sous 24h ouvrées" },
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
              <Link href="/dashboard">
                Accéder à mon espace
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg border shadow-xl">
          <div className="relative aspect-[4/3]">
            <Image
              src="/assets/photos/card-services-payment.jpg"
              alt="Paiement sécurisé en ligne"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-12 lg:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold">Paiement des frais d'admission</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              AVI CERTIFY peut également traiter le paiement de vos frais d'admission universitaire sous 24h, évitant les délais bancaires internationaux.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
