import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  ShieldCheck,
  MessageCircle,
  Check,
  UserCheck,
  Linkedin,
  Facebook,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { LeadFormSection } from "@/components/marketing/lead-form-section";
import { StudentJourneyCards } from "@/components/marketing/landing-interactive";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ServiceCard } from "@/components/marketing/service-card";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";
import { TrustBanner } from "@/components/marketing/trust-banner";
import { Button } from "@/components/ui/button";
import { services } from "@/constants/services";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "AVI étudiant, visa et dossier financier",
  description:
    "Préparez votre AVI étudiant, votre attestation d'hébergement, votre préfinancement et votre dossier de visa avec un accompagnement structuré. Remboursement garanti en cas de refus de visa.",
  path: "/",
});


export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative grid gap-12 py-16 md:grid-cols-2 md:items-center md:gap-16 md:py-24 lg:py-32">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent-dark">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Société immatriculée • Remboursement garanti si refus de visa
            </div>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Admis à l&apos;étranger. Maintenant, sécurisons votre dossier.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Preuve de fonds, logement, financement et visa : AVI CERTIFY vous
              accompagne à chaque étape de votre mobilité vers l&apos;Europe ou le
              Canada. Si votre visa est refusé, vous êtes remboursé intégralement,
              sous 24h.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" variant="cta" className="text-base" asChild>
                <TrackedCtaLink
                  href="/contact"
                  analyticsLocation="home_hero"
                  analyticsLabel="Commencer mon dossier"
                >
                  Commencer mon dossier
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </TrackedCtaLink>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <a
                  href="https://wa.me/message/XOKRBYI3ZEQBM1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Parler à un conseiller
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Pensé pour les étudiants d&apos;Afrique francophone en mobilité vers
              l&apos;Europe ou le Canada — et pour les familles qui les accompagnent.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                { icon: Check, label: "Documents vérifiables" },
                { icon: ShieldCheck, label: "Paiement sécurisé" },
                { icon: Building2, label: "Société immatriculée" },
                { icon: BadgeCheck, label: "Remboursement garanti" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg border shadow-2xl">
              <Image
                src="/assets/photos/beautifull-african-student-landed-france.jpg"
                alt="Étudiante africaine arrivée en France pour ses études"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <TrustBanner />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0">
          <Image
            src="/assets/photos/sorbonne-univertsity-beautifull.jpg.jpg"
            alt="Université Sorbonne Paris"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/88 to-primary-dark/95" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-accent via-[hsl(var(--institutional-yellow))] to-accent" />
        </div>
        <div className="container relative py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent-light">Votre situation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Admission obtenue. Maintenant, le dossier administratif.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-300">
              Entre l&apos;acceptation de l&apos;université et le départ, le parcours
              administratif peut créer du stress. Voici les trois étapes où AVI
              CERTIFY vous évite les mauvaises surprises.
            </p>
          </div>
          <StudentJourneyCards />
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <SectionHeading
          eyebrow="Services"
          title="Les démarches essentielles, organisées au même endroit"
          description="Preuve de fonds, AVI, transferts internationaux, paiement de frais de scolarité, attestation de logement et visa : une équipe spécialisée structure chaque étape pour limiter les oublis qui retardent un dossier."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.href} service={service} />
          ))}
        </div>
      </section>

      <section className="container grid gap-8 py-16 md:grid-cols-3 md:py-24">
        {[
          {
            icon: ShieldCheck,
            title: "Remboursement garanti",
            text: "Si votre visa est refusé, vous êtes remboursé intégralement et sans condition, sous 24h sur simple présentation du refus.",
            cta: "Voir la garantie",
            href: "/prix#garantie-remboursement",
          },
          {
            icon: FileCheck2,
            title: "Documents sécurisés",
            text: "Chaque attestation porte un QR code et un lien public de vérification, pour contrôler son authenticité en quelques secondes.",
            cta: "Vérifier un document",
            href: "https://verify.avicertify.fr/",
          },
          {
            icon: UserCheck,
            title: "Un humain, pas un formulaire",
            text: "Une équipe joignable par WhatsApp à chaque étape de votre dossier, y compris pendant le paiement.",
            cta: "Parler à un conseiller",
            href: "https://wa.me/message/XOKRBYI3ZEQBM1",
          },
        ].map((item) => {
          const isExternal = item.href.startsWith("http");
          return (
            <Link
              key={item.title}
              href={item.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="group relative overflow-hidden rounded-lg border bg-muted/30 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
                  <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  {item.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="border-b bg-muted/30">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Direction</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Un accompagnement pensé par des professionnels de la mobilité internationale
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              AVI CERTIFY réunit des spécialistes mobilité internationale, finance documentaire, paiement international, visa et vérification de dossier pour accompagner les étudiants et leurs familles.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-lg border bg-background shadow-lg">
            <div className="relative aspect-[21/9]">
              <Image
                src="/assets/photos/meetup-team.jpg"
                alt="Équipe et étudiants AVI CERTIFY"
                fill
                className="object-cover"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="rounded-lg border bg-muted/30 px-4 py-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Gabriel Emmanuel Befolo Nkoa, fondateur d&apos;AVI CERTIFY
                  </p>
                </div>
                <a
                  href="https://www.linkedin.com/in/gabriel-emmanuel-befolo-nkoa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:bg-accent/5"
                >
                  <Linkedin className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span>Profil LinkedIn vérifiable</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsCarousel />

      <section className="border-y bg-gradient-to-br from-muted/40 via-accent/5 to-muted/40">
        <div className="container py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Partenariats financiers</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              AVI CERTIFY ne travaille pas seule
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Nous nous appuyons sur des partenariats réels avec des acteurs
              financiers internationaux pour faciliter certaines solutions de
              préfinancement des études, de crédit à la consommation étudiant et
              de transferts multi-devises. L&apos;accès à une solution de
              financement reste soumis à l&apos;étude individuelle de chaque
              dossier.
            </p>
          </div>

          <div className="relative mt-12 overflow-hidden">
            <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-muted/40 to-transparent" />
            <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-muted/40 to-transparent" />

            <div className="flex gap-12 py-8 ecosystem-scroll">
              {[
                { name: "UBA Group", logo: "/assets/photos/logo_uba.png", url: "https://www.ubagroup.com/", width: 120, height: 40 },
                { name: "BGFI Bank", logo: "/assets/photos/logo_BGFI.png", url: "https://groupebgfibank.com/", width: 140, height: 40 },
                { name: "RBC Royal Bank", logo: "/assets/photos/logo_RBC.png", url: "https://www.rbcroyalbank.com/", width: 100, height: 40 },
                { name: "Boursorama Banque", logo: "/assets/photos/logo_boursorama.png", url: "https://www.boursorama.com/", width: 140, height: 40 },
                { name: "BNP Paribas", logo: "/assets/photos/logo_bnpparibas.svg", url: "https://mabanque.bnpparibas/", width: 120, height: 40 },
                { name: "Wise", logo: "/assets/photos/logo_wise.png", url: "https://wise.com/", width: 90, height: 40 },
              ].concat([
                { name: "UBA Group", logo: "/assets/photos/logo_uba.png", url: "https://www.ubagroup.com/", width: 120, height: 40 },
                { name: "BGFI Bank", logo: "/assets/photos/logo_BGFI.png", url: "https://groupebgfibank.com/", width: 140, height: 40 },
                { name: "RBC Royal Bank", logo: "/assets/photos/logo_RBC.png", url: "https://www.rbcroyalbank.com/", width: 100, height: 40 },
                { name: "Boursorama Banque", logo: "/assets/photos/logo_boursorama.png", url: "https://www.boursorama.com/", width: 140, height: 40 },
                { name: "BNP Paribas", logo: "/assets/photos/logo_bnpparibas.svg", url: "https://mabanque.bnpparibas/", width: 120, height: 40 },
                { name: "Wise", logo: "/assets/photos/logo_wise.png", url: "https://wise.com/", width: 90, height: 40 },
              ]).map((bank, index) => (
                <a
                  key={`${bank.name}-${index}`}
                  href={bank.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center justify-center grayscale opacity-60 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
                  aria-label={bank.name}
                >
                  <Image
                    src={bank.logo}
                    alt={bank.name}
                    width={bank.width}
                    height={bank.height}
                    className="h-10 w-auto object-contain"
                  />
                </a>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Acteurs financiers internationaux mobilisés selon les besoins de
            financement, de transfert et de mobilité de votre dossier.
          </p>
        </div>
      </section>

      <section className="border-b bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container py-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">Suivez-nous</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <a
              href="https://www.facebook.com/share/1HoEpQytnw/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background transition-colors hover:border-primary hover:bg-primary/5"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </a>
            <a
              href="https://www.linkedin.com/company/avi-certify/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background transition-colors hover:border-primary hover:bg-primary/5"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <div className="border-b bg-background">
        <div className="container flex items-center justify-center gap-2 py-4 text-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>Un conseiller vous répond sous 24h ouvrées.</span>
        </div>
      </div>

      <LeadFormSection />
    </>
  );
}
