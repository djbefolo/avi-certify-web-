import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronRight,
  CircleCheckBig,
  FileCheck2,
  FileSearch,
  GraduationCap,
  HandHeart,
  House,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Plane,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import { LeadFormSection } from "@/components/marketing/lead-form-section";
import { HomepageGuideCta } from "@/components/marketing/homepage-guide-cta";
import { Button } from "@/components/ui/button";
import { services } from "@/constants/services";

const servicePresentation = {
  avi: {
    icon: Landmark,
    tone: "from-sky-50 to-blue-50/40 border-sky-200/80",
    iconTone: "bg-sky-600 text-white",
    accent: "text-sky-800",
  },
  hebergement: {
    icon: House,
    tone: "from-amber-50 to-orange-50/40 border-amber-200/80",
    iconTone: "bg-amber-500 text-white",
    accent: "text-amber-900",
  },
  prefinancement: {
    icon: WalletCards,
    tone: "from-emerald-50 to-teal-50/40 border-emerald-200/80",
    iconTone: "bg-emerald-600 text-white",
    accent: "text-emerald-900",
  },
  "accompagnement-visa": {
    icon: FileSearch,
    tone: "from-violet-50 to-indigo-50/40 border-violet-200/80",
    iconTone: "bg-violet-600 text-white",
    accent: "text-violet-900",
  },
} as const;

const journey = [
  {
    number: "01",
    title: "Votre projet d'études",
    text: "Admission, calendrier, destination : partez d'un projet académique cohérent.",
    icon: GraduationCap,
  },
  {
    number: "02",
    title: "Vos ressources",
    text: "Clarifiez les fonds, paiements et justificatifs adaptés à votre situation.",
    icon: WalletCards,
  },
  {
    number: "03",
    title: "Votre dossier visa",
    text: "Préparez les pièces, les étapes Campus France ou consulaires selon votre parcours.",
    icon: FileCheck2,
  },
  {
    number: "04",
    title: "Votre logement",
    text: "Présentez une solution d'hébergement cohérente avec votre arrivée.",
    icon: House,
  },
  {
    number: "05",
    title: "Votre installation",
    text: "Gardez une vision claire des prochaines démarches de mobilité.",
    icon: Plane,
  },
];

const process = [
  "Vous présentez votre projet et votre besoin.",
  "Nous identifions l'accompagnement adapté.",
  "Vous rassemblez les informations essentielles.",
  "Vous avancez étape par étape depuis votre espace.",
];

function SectionMarker({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
      <span className="h-px w-7 bg-accent" aria-hidden="true" />
      {children}
    </p>
  );
}

export function HomepageConversionV2() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[hsl(222,75%,8%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_24%,rgba(16,185,129,0.28),transparent_29%),radial-gradient(circle_at_17%_0%,rgba(37,99,235,0.35),transparent_35%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--institutional-yellow))]/70 to-transparent" />
        <div className="container relative grid gap-12 pb-16 pt-14 md:pb-24 md:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 backdrop-blur">
              <BadgeCheck
                className="h-4 w-4 text-[hsl(var(--institutional-yellow))]"
                aria-hidden="true"
              />
              Une plateforme pour les étapes critiques de votre mobilité
            </div>
            <h1 className="mt-7 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[4.15rem]">
              Un projet d'études à l'international mérite un cadre solide.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              AVI CERTIFY accompagne les étudiants et leurs familles pour
              structurer les étapes décisives : projet académique, ressources,
              visa, logement et installation.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                className="h-12 px-6 text-base"
                size="lg"
                variant="cta"
                asChild
              >
                <TrackedCtaLink
                  analyticsLabel="Démarrer mon projet"
                  analyticsLocation="homepage_hero_primary"
                  href="/contact"
                >
                  Démarrer mon projet
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </TrackedCtaLink>
              </Button>
              <TrackedWhatsAppLink
                analyticsLocation="homepage_hero_secondary"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                <MessageCircle
                  className="h-4 w-4 text-accent-light"
                  aria-hidden="true"
                />
                Parler à un conseiller
              </TrackedWhatsAppLink>
            </div>
            <div className="mt-10 grid max-w-2xl gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
              {[
                "Accompagnement humain",
                "Documents conçus pour être vérifiables",
                "Parcours digital sécurisé",
              ].map((item) => (
                <p
                  className="flex gap-2 text-sm leading-5 text-slate-200"
                  key={item}
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-light"
                    aria-hidden="true"
                  />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-5 rounded-[2rem] bg-[hsl(var(--institutional-yellow))]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-2 shadow-2xl shadow-slate-950/40">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.1rem]">
                <Image
                  alt="Étudiante préparant son projet d'études en France"
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 44vw"
                  src="/assets/photos/beautifull-african-student-landed-france.jpg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-slate-950/65 p-4 backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--institutional-yellow))]">
                    Votre projet, étape par étape
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    Une information claire avant chaque décision importante.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-[#f6f8fb]">
        <div className="container grid gap-px overflow-hidden border-x border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheck,
              label: "Société immatriculée",
              text: "Une identité légale publique et accessible.",
            },
            {
              icon: FileCheck2,
              label: "Documents vérifiables",
              text: "Lorsque le produit le prévoit, une vérification est disponible.",
            },
            {
              icon: LockKeyhole,
              label: "Espace protégé",
              text: "Un suivi depuis un espace client authentifié.",
            },
            {
              icon: HandHeart,
              label: "Équipe à vos côtés",
              text: "Un accompagnement humain pour avancer avec méthode.",
            },
          ].map((item) => (
            <div className="bg-[#f6f8fb] px-5 py-6" key={item.label}>
              <item.icon className="h-5 w-5 text-accent" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-primary">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-20 md:py-28" id="parcours">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="max-w-md">
            <SectionMarker>Votre parcours</SectionMarker>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] text-primary sm:text-4xl">
              Chaque projet a son point de départ.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Vous n'avez pas besoin de tout faire. Identifiez l'étape qui
              compte maintenant, puis avancez avec les informations utiles.
            </p>
            <TrackedCtaLink
              analyticsLabel="Découvrir les services"
              analyticsLocation="homepage_journey"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-accent/50 decoration-2 underline-offset-8 transition hover:decoration-accent"
              href="/services"
            >
              Découvrir les services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {journey.map((step, index) => (
              <li
                className="group relative min-h-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
                key={step.number}
              >
                <span
                  className="absolute right-4 top-3 text-4xl font-semibold tracking-tighter text-slate-100"
                  aria-hidden="true"
                >
                  {step.number}
                </span>
                <step.icon
                  className="relative h-6 w-6 text-accent"
                  aria-hidden="true"
                />
                <h3 className="relative mt-14 text-lg font-semibold leading-6 text-primary">
                  {step.title}
                </h3>
                <p className="relative mt-3 text-sm leading-6 text-slate-600">
                  {step.text}
                </p>
                {index < journey.length - 1 ? (
                  <ChevronRight
                    className="absolute -right-5 top-1/2 hidden h-7 w-7 rounded-full border border-slate-200 bg-white p-1 text-slate-400 xl:block"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="border-y border-slate-200 bg-slate-50 py-20 md:py-28"
        id="services"
      >
        <div className="container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <SectionMarker>Services</SectionMarker>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] text-primary sm:text-4xl">
                Les démarches clés, expliquées simplement.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Choisissez uniquement l'accompagnement qui répond à votre étape
                actuelle.
              </p>
            </div>
            <TrackedCtaLink
              analyticsLabel="Voir tous les services"
              analyticsLocation="homepage_services"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              href="/services"
            >
              Voir tous les services{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {services.map((service) => {
              const presentation =
                servicePresentation[
                  service.slug as keyof typeof servicePresentation
                ];
              const Icon = presentation.icon;
              return (
                <Link
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${presentation.tone}`}
                  href={service.href}
                  key={service.href}
                >
                  <div className="flex items-start justify-between gap-5">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-sm ${presentation.iconTone}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-[0.16em] ${presentation.accent}`}
                    >
                      {service.kicker}
                    </span>
                  </div>
                  <h3 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-primary">
                    {service.title}
                  </h3>
                  <p className="mt-3 max-w-xl leading-7 text-slate-700">
                    {service.description}
                  </p>
                  <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Découvrir ce service{" "}
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="relative isolate overflow-hidden bg-primary py-20 text-white md:py-28"
        id="confiance"
      >
        <Image
          alt="Université à Paris"
          className="object-cover opacity-15"
          fill
          sizes="100vw"
          src="/assets/photos/sorbonne-univertsity-beautifull.jpg.jpg"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/75" />
        <div className="container relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[hsl(var(--institutional-yellow))]">
              <span
                className="h-px w-7 bg-[hsl(var(--institutional-yellow))]"
                aria-hidden="true"
              />
              Confiance
            </p>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              La clarté avant l'engagement.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">
              Un projet international implique des informations sensibles et des
              décisions importantes. Nous privilégions des repères clairs, des
              prix accessibles et un suivi structuré.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Processus structuré",
                text: "Les informations utiles sont rassemblées selon l'étape de votre projet.",
              },
              {
                title: "Documents vérifiables",
                text: "Les produits qui le prévoient intègrent des mécanismes de vérification.",
              },
              {
                title: "Accompagnement humain",
                text: "Une équipe répond à vos questions avant et pendant le parcours.",
              },
              {
                title: "Prix consultables",
                text: "Les services et leurs modalités sont présentés sur une page dédiée.",
              },
            ].map((item) => (
              <div
                className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm"
                key={item.title}
              >
                <CircleCheckBig
                  className="h-5 w-5 text-accent-light"
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="container grid gap-12 py-20 md:py-28 lg:grid-cols-[1fr_0.95fr] lg:items-center"
        id="comment-ca-marche"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#e8eef5] p-3 shadow-xl shadow-slate-900/10">
          <div className="relative aspect-[5/4] overflow-hidden rounded-xl">
            <Image
              alt="Étudiante organisant son dossier de mobilité"
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              src="/assets/photos/customer-service-avi-certify.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-xl bg-white/95 p-4 text-primary shadow-lg">
              <FileCheck2 className="h-6 w-6 text-accent" aria-hidden="true" />
              <p className="text-sm font-semibold">
                Des démarches expliquées avant chaque prochaine action.
              </p>
            </div>
          </div>
        </div>
        <div>
          <SectionMarker>Comment ça marche</SectionMarker>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] text-primary sm:text-4xl">
            Un parcours clair, sans vocabulaire inutile.
          </h2>
          <ol className="mt-8 grid gap-4">
            {process.map((item, index) => (
              <li
                className="flex gap-4 border-b border-slate-200 pb-4 last:border-0"
                key={item}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  0{index + 1}
                </span>
                <p className="pt-1 text-base leading-6 text-slate-700">
                  {item}
                </p>
              </li>
            ))}
          </ol>
          <TrackedCtaLink
            analyticsLabel="Comprendre le parcours"
            analyticsLocation="homepage_how_it_works"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary underline decoration-accent/50 decoration-2 underline-offset-8"
            href="/comment-ca-marche"
          >
            Comprendre le parcours{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TrackedCtaLink>
        </div>
      </section>

      <section className="border-y bg-[#f6f8fb] py-20 md:py-28" id="prix">
        <div className="container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <SectionMarker>Tarifs</SectionMarker>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] text-primary sm:text-4xl">
              Des prix et des modalités accessibles avant de commencer.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Chaque service répond à un besoin différent. Consultez les tarifs
              et choisissez l'étape qui correspond à votre projet.
            </p>
            <Button
              className="mt-8 h-12 px-6"
              size="lg"
              variant="outline"
              asChild
            >
              <TrackedCtaLink
                analyticsLabel="Consulter les tarifs"
                analyticsLocation="homepage_pricing"
                href="/prix"
              >
                Consulter les tarifs{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedCtaLink>
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Selon votre besoin
            </p>
            <div className="mt-7 space-y-4">
              {[
                "Preuve de fonds / AVI",
                "Hébergement et attestation",
                "Préfinancement étudiant",
                "Accompagnement visa",
              ].map((item) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
                  key={item}
                >
                  <span className="font-medium text-primary">{item}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
            <p className="mt-7 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Vous pouvez comparer les modalités sans démarrer de paiement
              depuis cette page.
            </p>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[hsl(222,75%,8%)] py-20 text-white md:py-24">
        <div className="absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-accent/30 blur-3xl" />
        <div className="container relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[hsl(var(--institutional-yellow))]">
              <BookOpenCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Guide 2026 : réussir son installation en France.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-200">
              Les 7 erreurs qui fragilisent un projet d'études en France, dans
              un guide réservé aux personnes qui en font la demande.
            </p>
          </div>
          <HomepageGuideCta />
        </div>
      </section>

      <section className="container grid gap-12 py-20 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="relative aspect-[4/3]">
            <Image
              alt="Équipe d'accompagnement AVI CERTIFY"
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              src="/assets/photos/meetup-team.jpg"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent px-6 pb-6 pt-16">
            <p className="text-sm font-semibold text-white">
              Une équipe disponible pour vous orienter.
            </p>
          </div>
        </div>
        <div>
          <SectionMarker>Échangez avec nous</SectionMarker>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.025em] text-primary sm:text-4xl">
            Vous souhaitez clarifier votre prochaine étape ?
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Parlez de votre projet à l'équipe AVI CERTIFY ou laissez-nous les
            informations essentielles pour recevoir une réponse adaptée.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedWhatsAppLink
              analyticsLocation="homepage_contact"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Parler sur WhatsApp
            </TrackedWhatsAppLink>
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-primary/20 px-5 text-sm font-semibold text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              href="tel:+33753247314"
            >
              (+33) 7 53 24 73 14
            </a>
          </div>
          <a
            className="mt-5 inline-flex text-sm font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-primary"
            href="mailto:contact@avicertify.fr"
          >
            contact@avicertify.fr
          </a>
        </div>
      </section>

      <LeadFormSection />
    </>
  );
}
