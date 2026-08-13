import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Check,
  FileCheck2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HomeGuideCta } from "@/components/guide/home-guide-cta";
import { TrackedCtaLink } from "@/components/analytics/tracked-cta-link";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Étudier en France : par où commencer ?",
  description:
    "AVI CERTIFY vous aide à préparer les démarches qui comptent maintenant : visa, ressources, logement et financement étudiant.",
  path: "/",
});

const situations = [
  {
    title: "Mon admission vient d’arriver",
    detail: "Voir les prochaines démarches",
    href: "/comment-ca-marche",
    tone: "bg-emerald-600",
  },
  {
    title: "Je prépare Campus France / mon visa",
    detail: "Comprendre le parcours visa",
    href: "/services/accompagnement-visa",
    tone: "bg-[#0c1b36]",
  },
  {
    title: "Je dois justifier mes ressources",
    detail: "Comprendre l’AVI",
    href: "/services/avi",
    tone: "bg-[#d8a72d]",
  },
  {
    title: "Je finance les études de mon enfant",
    detail: "Voir les options de financement",
    href: "/services/prefinancement",
    tone: "bg-emerald-700",
  },
  {
    title: "Je cherche mon logement",
    detail: "Voir l’accompagnement logement",
    href: "/services/hebergement",
    tone: "bg-[#10284a]",
  },
  {
    title: "Je ne sais pas encore par quoi commencer",
    detail: "On regarde ensemble",
    href: "/contact",
    tone: "bg-[#d8a72d]",
  },
] as const;

const services = [
  {
    label: "AVI",
    description: "Justifier vos ressources quand votre dossier le demande.",
    href: "/services/avi",
  },
  {
    label: "Visa / Campus France",
    description: "Mettre vos pièces, votre projet et votre calendrier dans le même sens.",
    href: "/services/accompagnement-visa",
  },
  {
    label: "Préfinancement",
    description: "Comprendre ce que votre famille doit préparer avant de s’engager.",
    href: "/services/prefinancement",
  },
  {
    label: "Logement",
    description: "Présenter une solution d’hébergement cohérente avec votre arrivée.",
    href: "/services/hebergement",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200/70 bg-[#fcfbf8]">
        <div className="container grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.88fr)] lg:items-center lg:gap-20 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Études · Visa · Installation
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[0.96] tracking-[-0.045em] text-[#0c162a] sm:text-5xl lg:text-6xl">
              Votre projet d’études devient concret.
              <span className="mt-2 block text-[0.6em] leading-[1.08] tracking-[-0.03em] text-slate-700">
                Et tout à coup, les questions arrivent aussi.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Le visa, les fonds, le logement, les délais… Vous n’avez pas besoin de tout régler le même jour. Dites-nous simplement où vous en êtes, et commençons par ce qui compte maintenant.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedCtaLink
                analyticsLabel="Voir par où commencer"
                analyticsLocation="homepage_hero_primary"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                href="#situations"
              >
                Voir par où commencer
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TrackedCtaLink>
              <TrackedWhatsAppLink
                analyticsLocation="homepage_hero_secondary"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#0c162a] px-5 py-3 text-sm font-semibold text-[#0c162a] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c162a] focus-visible:ring-offset-2"
              >
                Parler de mon projet
              </TrackedWhatsAppLink>
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Pas de promesse de visa. Pas de jargon inutile. Une équipe joignable.
            </p>
          </div>

          <div className="relative aspect-[1.12/1] overflow-hidden rounded-2xl border border-slate-200 bg-[#edf3fa] shadow-[0_18px_48px_rgba(12,22,42,0.08)] lg:aspect-[1.04/1]">
            <Image
              src="/assets/photos/beautifull-african-student-landed-france.jpg"
              alt="Étudiante arrivée en France pour son projet d’études"
              fill
              priority
              sizes="(max-width: 1024px) calc(100vw - 3rem), 44vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="situations" className="scroll-mt-24 bg-white py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Votre situation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0c162a] sm:text-4xl">
              On commence où ?
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Admission reçue, visa à préparer, fonds à justifier, logement à trouver… choisissez simplement ce qui ressemble le plus à votre situation.
            </p>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {situations.map((situation) => (
              <TrackedCtaLink
                key={situation.title}
                analyticsLabel={situation.title}
                analyticsLocation="homepage_situation"
                href={situation.href}
                className="group min-h-32 rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${situation.tone}`}>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="mt-4 block text-base font-semibold leading-5 text-[#0c162a]">{situation.title}</span>
                <span className="mt-2 block text-sm text-slate-500">{situation.detail}</span>
              </TrackedCtaLink>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-[#f4f7fb] py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Après la situation, le service</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0c162a] sm:text-4xl">
              Vous n’avez pas besoin de connaître nos produits avant de savoir pourquoi ils peuvent vous aider.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <TrackedCtaLink
                key={service.label}
                analyticsLabel={service.label}
                analyticsLocation="homepage_service"
                href={service.href}
                className={`group flex min-h-56 flex-col rounded-lg border border-white/80 p-6 shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${index % 2 === 1 ? "bg-[#e9f2fc]" : "bg-white"}`}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{String(index + 1).padStart(2, "0")}</span>
                <span className="mt-6 text-xl font-semibold tracking-[-0.03em] text-[#0c162a]">{service.label}</span>
                <span className="mt-3 text-sm leading-6 text-slate-600">{service.description}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-semibold text-emerald-700">
                  Découvrir <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </TrackedCtaLink>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07142b] text-white">
        <div className="container grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-20 lg:py-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d8a72d]">Un projet humain</p>
            <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
              Un projet d’études, ce n’est jamais juste un dossier.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
              Il y a l’école choisie, le budget, les rendez-vous, la famille qui accompagne, le logement qu’on regarde et l’arrivée qu’on imagine. Votre dossier vous aide à raconter chaque chose à sa place, au bon moment.
            </p>
            <TrackedCtaLink
              analyticsLabel="Voir comment on peut aider"
              analyticsLocation="homepage_editorial"
              href="#services"
              className="mt-8 inline-flex min-h-12 items-center gap-2 text-sm font-semibold text-[#e7c058] underline underline-offset-8 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
            >
              Voir comment on peut aider <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
          <div className="relative aspect-[1.2/1] overflow-hidden rounded-2xl border border-white/10 bg-[#e8f1fb] shadow-2xl">
            <Image
              src="/assets/photos/student-at-university.jpg"
              alt="Étudiant sur son campus universitaire"
              fill
              sizes="(max-width: 1024px) calc(100vw - 3rem), 56vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#fcfbf8] py-16 sm:py-20 lg:py-24">
        <div className="container grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="relative aspect-[1.23/1] overflow-hidden rounded-2xl border border-slate-200 bg-[#e8f1fb]">
            <Image
              src="/assets/photos/student-meetup-avi-certify-services.png"
              alt="Étudiant et proches préparant un projet d’études"
              fill
              sizes="(max-width: 1024px) calc(100vw - 3rem), 48vw"
              className="object-cover"
            />
          </div>
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Pour les familles</p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.04] tracking-[-0.04em] text-[#0c162a] sm:text-4xl">
              Quand un étudiant part, toute une famille prépare aussi ce départ.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Vous financez peut-être un projet préparé depuis des mois. Vous avez le droit de comprendre ce qui est demandé, ce qui est payé, ce qui reste à décider et quand.
            </p>
            <TrackedCtaLink
              analyticsLabel="Comprendre le financement"
              analyticsLocation="homepage_family"
              href="/services/prefinancement"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              Comprendre le financement <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Confiance utile</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0c162a] sm:text-4xl">
              La confiance ne devrait pas être une longue liste de logos.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Elle se voit dans ce que vous pouvez vérifier, comprendre et retrouver facilement quand vous en avez besoin.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileCheck2, title: "Documents vérifiables", text: "Lorsque la situation le permet, une référence peut être contrôlée." },
              { icon: LockKeyhole, title: "Espace client protégé", text: "Vos pièces et votre suivi restent dans un espace qui vous appartient." },
              { icon: Check, title: "Prix consultables", text: "Vous pouvez comprendre les modalités avant de vous engager." },
              { icon: MessageCircle, title: "Une réponse quand vous en avez besoin", text: "Une équipe joignable pour parler d’un point précis." },
            ].map((item) => (
              <article key={item.title} className="rounded-lg bg-[#f7f9fc] p-6">
                <item.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold text-[#0c162a]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fcfbf8] py-16 sm:py-20">
        <div className="container flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Les prix</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0c162a] sm:text-4xl">Combien ça coûte ?</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Les services n’ont pas tous le même modèle. Les prix et modalités apparaissent clairement, selon ce que vous préparez.
            </p>
            <TrackedCtaLink
              analyticsLabel="Voir les tarifs"
              analyticsLocation="homepage_pricing"
              href="/prix"
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md border border-[#0c162a] px-5 py-3 text-sm font-semibold text-[#0c162a] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c162a] focus-visible:ring-offset-2"
            >
              Voir les tarifs <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </TrackedCtaLink>
          </div>
          <p className="max-w-sm text-sm font-medium leading-6 text-slate-600 lg:text-right">AVI · Hébergement · Préfinancement · Visa</p>
        </div>
      </section>

      <section className="bg-[#f3ead5] py-16 sm:py-20">
        <div className="container grid gap-8 md:grid-cols-[1fr_0.55fr] md:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Guide 2026</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0c162a] sm:text-4xl">Pas encore prêt à commencer ?</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Commencez par le Guide 2026 : les repères utiles pour éviter les erreurs fréquentes avant une arrivée en France.
            </p>
            <HomeGuideCta />
          </div>
          <div className="rounded-xl border border-white/70 bg-[#e8f1fb] p-7 shadow-sm">
            <BookOpenCheck className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <p className="mt-12 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">France</p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#0c162a]">Guide 2026 / commencer à préparer son départ</p>
          </div>
        </div>
      </section>

      <section className="bg-[#07142b] py-16 text-white sm:py-20 lg:py-24">
        <div className="container grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d8a72d]">Restons en contact</p>
            <h2 className="mt-4 text-3xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">
              Une question précise ? Parlons-en simplement.
            </h2>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedWhatsAppLink
                analyticsLocation="homepage_human_exit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Parler sur WhatsApp
              </TrackedWhatsAppLink>
              <TrackedCtaLink
                analyticsLabel="Laisser ma demande"
                analyticsLocation="homepage_human_exit"
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/70 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#07142b]"
              >
                Laisser ma demande
              </TrackedCtaLink>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 lg:grid-cols-1">
            <a className="inline-flex items-center gap-2 transition-colors hover:text-white" href="tel:+33753247314"><Phone className="h-4 w-4 text-[#d8a72d]" aria-hidden="true" />(+33) 7 53 24 73 14</a>
            <a className="inline-flex items-center gap-2 transition-colors hover:text-white" href="mailto:contact@avicertify.fr"><Mail className="h-4 w-4 text-[#d8a72d]" aria-hidden="true" />contact@avicertify.fr</a>
            <Link className="inline-flex items-center gap-2 transition-colors hover:text-white" href="/contact"><ShieldCheck className="h-4 w-4 text-[#d8a72d]" aria-hidden="true" />Parler de mon projet</Link>
          </div>
        </div>
      </section>
    </>
  );
}
