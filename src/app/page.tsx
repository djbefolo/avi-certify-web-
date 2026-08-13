import {
  ArrowRight,
  Clock,
  Linkedin,
  Mail,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import { LeadFormSection } from "@/components/marketing/lead-form-section";
import { ProcessSteps, StudentJourneyCards } from "@/components/marketing/landing-interactive";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";
import { TrustBanner } from "@/components/marketing/trust-banner";
import { services } from "@/constants/services";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Préparer un projet d’études à l’international",
  description:
    "AVI CERTIFY accompagne les étudiants et leurs familles pour organiser un projet d’études, du financement au visa et à l’installation.",
  path: "/",
});

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1HoEpQytnw/?mibextid=wwXIfr",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/avi-certify/",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-[#FCFAF5]">
        <div className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,0.93fr)_minmax(430px,0.87fr)] lg:items-center lg:gap-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Études · Visa · Installation
            </p>
            <h1 className="mt-5 text-balance text-[2.65rem] font-semibold leading-[0.96] tracking-[-0.055em] text-[#07142B] sm:text-6xl lg:text-[4.15rem]">
              Préparer un départ, c’est déjà commencer à vivre son projet.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-8 text-slate-700 sm:text-lg">
              L’école choisie, le budget, les rendez-vous, le logement et la date de départ finissent par former un seul projet. AVI CERTIFY vous aide à voir clair dans les prochaines étapes, sans vous faire courir après une liste de produits.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <TrackedCtaLink
                analyticsLabel="Commencer mon dossier"
                analyticsLocation="homepage_hero_primary"
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF5]"
              >
                Commencer mon dossier
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedCtaLink>
              <TrackedWhatsAppLink
                analyticsLocation="homepage_hero_secondary"
                className="inline-flex min-h-12 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold text-[#07142B] underline decoration-[#D8A72D] decoration-2 underline-offset-8 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07142B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF5]"
              >
                Parler de mon projet
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedWhatsAppLink>
            </div>
            <p className="mt-6 text-sm leading-6 text-slate-500">
              Une équipe joignable, des étapes compréhensibles, aucune promesse de visa.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[585px] lg:ml-auto lg:max-w-none">
            <div className="absolute -left-4 top-8 hidden h-24 w-24 border-l border-t border-[#D8A72D] lg:block" aria-hidden="true" />
            <div className="relative aspect-[1.03/1] overflow-hidden rounded-[1.35rem] bg-[#dfe8e7]">
              <Image
                src="/assets/photos/beautifull-african-student-landed-france.jpg"
                alt="Étudiante préparant son projet d’études en France"
                fill
                priority
                sizes="(max-width: 1024px) calc(100vw - 3rem), 44vw"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      <TrustBanner />

      <section className="border-b border-slate-200 bg-white">
        <div className="container py-16 sm:py-20 lg:py-28">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Le point de départ</p>
              <h2 className="mt-4 max-w-md text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#07142B] sm:text-5xl">
                Chaque parcours commence à un endroit différent.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Une admission peut arriver avant les fonds. Le logement peut devenir urgent avant le rendez-vous visa. Plutôt que de tout traiter en même temps, nous vous aidons à remettre les priorités dans le bon ordre.
            </p>
          </div>
          <StudentJourneyCards />
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-[#FCFAF5]">
        <div className="container py-16 sm:py-20 lg:py-28">
          <div className="grid gap-8 border-b border-[#07142B]/15 pb-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Ce que nous pouvons préparer avec vous</p>
              <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#07142B] sm:text-5xl">
                Des démarches précises, quand elles deviennent nécessaires.
              </h2>
            </div>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Votre projet ne se résume pas à un service. Chaque accompagnement existe pour résoudre une étape concrète, au moment où elle compte réellement.
            </p>
          </div>
          <div className="grid divide-y divide-[#07142B]/15 md:grid-cols-2 md:divide-x md:divide-y-0">
            {services.map((service, index) => (
              <TrackedCtaLink
                key={service.href}
                analyticsLabel={service.kicker}
                analyticsLocation="homepage_service_editorial"
                href={service.href}
                className={`group block px-0 py-8 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4 ${index % 2 === 0 ? "md:pr-10" : "md:pl-10"}`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D8A72D]">{service.kicker}</span>
                <span className="mt-3 flex items-start justify-between gap-5 text-2xl font-semibold leading-tight tracking-[-0.035em] text-[#07142B] group-hover:text-emerald-700">
                  {service.title}
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
                <span className="mt-3 block max-w-md text-base leading-7 text-slate-600">{service.description}</span>
              </TrackedCtaLink>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07142B] text-white">
        <div className="container grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-20 lg:py-28">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[1.15/1] overflow-hidden rounded-[1.35rem]">
              <Image
                src="/assets/photos/student-at-university.jpg"
                alt="Étudiante sur son campus universitaire"
                fill
                sizes="(max-width: 1024px) calc(100vw - 3rem), 42vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D8A72D]">Un projet humain</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.01] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
              Un projet d’études, ce n’est jamais juste un dossier.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Il y a l’école choisie, le budget à organiser, les rendez-vous, le logement, les appels avec la famille… et cette date de départ qui se rapproche peu à peu. Toutes ces décisions finissent par former un seul projet. C’est justement notre rôle de vous aider à ne rien perdre de vue.
            </p>
            <TrackedCtaLink
              analyticsLabel="Voir les étapes du parcours"
              analyticsLocation="homepage_editorial"
              href="#parcours"
              className="mt-9 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#D8A72D] underline decoration-[#D8A72D] decoration-1 underline-offset-8 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#07142B]"
            >
              Voir les étapes du parcours
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <section id="parcours" className="scroll-mt-24 bg-white">
        <div className="container grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20 lg:py-28">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Le parcours AVI CERTIFY</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#07142B] sm:text-5xl">
              Une suite d’étapes, pas une succession d’urgences.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
              Lorsque le dossier avance, chacun sait ce qu’il doit préparer, régler ou attendre. Les liens ci-contre gardent leurs comportements adaptés à votre espace client.
            </p>
          </div>
          <ProcessSteps />
        </div>
      </section>

      <section className="border-y border-[#07142B]/10 bg-[#FCFAF5]">
        <div className="container grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_0.94fr] lg:items-center lg:gap-20 lg:py-28">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.35rem]">
              <Image
                src="/assets/photos/student-meetup-avi-certify-services.png"
                alt="Échange entre une étudiante et une équipe d’accompagnement"
                fill
                sizes="(max-width: 1024px) calc(100vw - 3rem), 46vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Pour les familles</p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#07142B] sm:text-5xl">
              Quand un étudiant part, toute une famille prépare aussi ce départ.
            </h2>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-700">
              Derrière un projet d’études, il y a souvent des mois d’échanges, d’économies et de décisions prises en famille. Avant de vous engager, vous devez comprendre ce qui est demandé, ce que vous financez et ce qu’il reste encore à préparer.
            </p>
            <TrackedCtaLink
              analyticsLabel="Échanger avec un conseiller"
              analyticsLocation="homepage_family"
              href="/contact"
              className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF5]"
            >
              Échanger avec un conseiller
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="container py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Des personnes derrière le parcours</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#07142B] sm:text-5xl">
              Un accompagnement qui reste disponible quand les questions arrivent.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              L’expertise documentaire compte. La possibilité de parler à une équipe qui comprend le contexte familial et le calendrier du départ compte tout autant.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-[#FCFAF5] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="relative aspect-[16/10] lg:aspect-auto">
              <Image
                src="/assets/photos/customer-service-avi-certify.jpg"
                alt="Équipe d’accompagnement AVI CERTIFY"
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Contact direct</p>
              <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#07142B]">
                Parlons de ce qui doit avancer maintenant.
              </h3>
              <p className="mt-5 leading-7 text-slate-600">
                Une question sur les fonds, l’hébergement, le visa ou le financement ? Nous vous répondons avant que vous commenciez votre dossier.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                <TrackedWhatsAppLink
                  analyticsLocation="homepage_contact"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#07142B] underline decoration-[#D8A72D] decoration-2 underline-offset-8 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07142B] focus-visible:ring-offset-4"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Parler sur WhatsApp
                </TrackedWhatsAppLink>
                <a href="mailto:contact@avicertify.fr" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#07142B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07142B] focus-visible:ring-offset-4">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  contact@avicertify.fr
                </a>
                <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Réponse sous 24h ouvrées
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-[#07142B] text-white">
        <div className="container grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D8A72D]">Direction</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
              Une équipe attentive aux réalités de la mobilité internationale.
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-slate-300">
              AVI CERTIFY réunit des spécialistes de la mobilité internationale, de la finance documentaire, du paiement et de la vérification de dossier pour accompagner les étudiants et leurs familles.
            </p>
            <a
              href="https://www.linkedin.com/in/gabriel-emmanuel-befolo-nkoa/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#D8A72D] underline decoration-[#D8A72D] underline-offset-8 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#07142B]"
            >
              <Linkedin className="h-4 w-4" aria-hidden="true" />
              LinkedIn professionnel du fondateur
            </a>
          </div>
        </div>
      </section>

      <TestimonialsCarousel />

      <section className="border-y border-slate-200 bg-[#FCFAF5]">
        <div className="container py-16 sm:py-20 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Présence professionnelle</p>
              <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#07142B] sm:text-5xl">
                Rester informé, sans ajouter de bruit au parcours.
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-4 text-sm font-semibold text-[#07142B]">
              {socialLinks.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" className="underline decoration-[#D8A72D] decoration-2 underline-offset-8 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07142B] focus-visible:ring-offset-4">
                  {social.label}
                </a>
              ))}
              <Link href="/a-propos/mission" className="underline decoration-[#D8A72D] decoration-2 underline-offset-8 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07142B] focus-visible:ring-offset-4">
                Notre mission
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LeadFormSection />
    </>
  );
}
