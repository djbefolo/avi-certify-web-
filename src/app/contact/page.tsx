import { Mail, MessageCircle, Clock } from "lucide-react";
import Image from "next/image";
import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Contact conseiller AVI étudiant",
  description:
    "Contactez AVI CERTIFY pour qualifier votre besoin en AVI étudiant, attestation d'hébergement, préfinancement ou accompagnement visa.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Parlez à un conseiller AVI CERTIFY"
        description="Laissez vos coordonnées ou contactez l'équipe pour qualifier votre besoin et démarrer votre dossier."
      />
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:py-16">
        <div className="grid gap-6 self-start">
          <div className="rounded-lg border bg-gradient-to-br from-accent/5 to-accent/10 p-6 shadow-sm">
            <MessageCircle className="h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Échangez directement avec notre équipe</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Support étudiant et mobilité internationale
            </p>
            <div className="mt-6 space-y-4">
              <Button
                size="lg"
                variant="cta"
                className="w-full"
                asChild
              >
                <a
                  href="https://wa.me/message/XOKRBYI3ZEQBM1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                  Discussion immédiate WhatsApp
                </a>
              </Button>
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Réponse sous 24h ouvrées</span>
              </div>
            </div>
            <div className="mt-6 flex justify-center rounded-lg border bg-white p-4">
              <div className="text-center">
                <div className="inline-block rounded-lg bg-white p-2">
                  <Image
                    src="/assets/qr-code-whatsapp-avi-certify.png"
                    alt="QR Code WhatsApp AVI CERTIFY"
                    width={160}
                    height={160}
                    className="h-40 w-40"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Scannez pour discuter
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm font-medium text-accent">
              (+33) 7 53 24 73 14
            </p>
          </div>

          <div className="rounded-lg border bg-background p-6">
            <Mail className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">Email</h2>
            <a
              href="mailto:contact@avicertify.com"
              className="mt-2 inline-block text-muted-foreground transition-colors hover:text-primary"
            >
              contact@avicertify.com
            </a>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-6 shadow-sm md:p-8">
          <LeadForm />
        </div>
      </section>
    </>
  );
}
