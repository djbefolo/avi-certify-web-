import {
  ArrowRight,
  BadgeCheck,
  Check,
  ExternalLink,
  FileCheck2,
  Landmark,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { AuthAwareLink } from "@/components/navigation/auth-aware-link";
import { PricingSimulator } from "@/components/marketing/pricing-simulator";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";

const verifyAviUrl = "https://verify.avicertify.fr/";
const whatsappUrl = "https://wa.me/message/XOKRBYI3ZEQBM1";

export const metadata = createPageMetadata({
  title:
    "Tarifs AVI CERTIFY — AVI, hébergement, frais de scolarité et accompagnement visa",
  description:
    "Consultez les tarifs AVI CERTIFY pour l’attestation d’hébergement, l’AVI, le paiement des frais académiques et l’accompagnement visa, avec simulateur Europe et Canada.",
  path: "/prix",
});

const pricingFormula = [
  { label: "Montant choisi", value: "7 380 €" },
  { label: "Frais de service", value: "460 €" },
  { label: "Frais de gestion", value: "3,5 %" },
  { label: "Total indicatif", value: "8 098,30 €", result: true },
];

const offers = [
  {
    title: "Attestation d’hébergement",
    price: "79 €",
    description:
      "Attestation d’hébergement ou de domiciliation destinée à compléter le dossier étudiant, avec document PDF, QR code de vérification, lien public sécurisé et espace client.",
    includes: [
      "Attestation PDF",
      "QR code de vérification",
      "Lien public sécurisé",
      "Accès espace documents",
      "Support WhatsApp",
    ],
    cta: "Obtenir mon attestation",
    highlighted: false,
  },
  {
    title: "Attestation de Virement Irrévocable — AVI",
    price: "À partir de 8 098,30 € indicatif",
    description:
      "Le montant de 7 380 € est présenté comme une base indicative de référence pour justifier les ressources étudiantes. Le montant final peut varier selon le pays, l’année universitaire, les exigences consulaires, la situation personnelle et les règles applicables au dossier.",
    breakdown: [
      "Montant AVI de référence : 7 380 €",
      "Frais de service AVI CERTIFY : 460 €",
      "Frais de gestion et virement : 3,5 % × 7 380 € = 258,30 €",
      "Total indicatif : 8 098,30 €",
    ],
    includes: [
      "Structuration du dossier financier",
      "Préparation AVI",
      "Suivi documentaire",
      "Vérification de cohérence",
      "Support étudiant",
      "Lien de vérification AVI",
    ],
    cta: "Préparer mon AVI",
    highlighted: true,
    secondaryVerify: true,
  },
  {
    title: "Paiement frais de scolarité / admission",
    price: "Montant école + 5 %",
    description:
      "Service d’accompagnement au paiement des frais d’admission, frais de scolarité ou frais académiques auprès de l’établissement, avec suivi administratif et preuve de paiement lorsque disponible.",
    breakdown: [
      "Montant facturé par l’établissement : variable",
      "Frais de transfert / traitement : 5 %",
      "Suivi administratif : inclus",
    ],
    includes: [
      "Analyse de la facture école",
      "Paiement accompagné",
      "Suivi de confirmation",
      "Support administratif",
      "Coordination avec le dossier étudiant",
    ],
    cta: "Payer mes frais d’admission",
    highlighted: false,
  },
  {
    title: "Accompagnement visa, coaching & mobilité",
    price: "Sur devis",
    description:
      "Accompagnement personnalisé pour structurer le parcours Campus France, dossier consulaire, préparation documentaire, coaching entretien, départ et installation.",
    includes: [
      "Analyse du dossier",
      "Coaching visa / entretien",
      "Vérification documents",
      "Plan d’action personnalisé",
      "Support WhatsApp",
      "Préparation départ et arrivée",
    ],
    cta: "Parler à un conseiller",
    highlighted: false,
    whatsapp: true,
  },
];

const comparisonRows = [
  {
    service: "Attestation d’hébergement",
    formula: "79 €",
    ideal: "Compléter un dossier étudiant avec une preuve d’hébergement vérifiable.",
    action: "Obtenir mon attestation",
  },
  {
    service: "AVI",
    formula: "7 380 € + 460 € + 3,5 % indicatif",
    ideal: "Structurer la preuve de ressources et préparer une attestation vérifiable.",
    action: "Préparer mon AVI",
  },
  {
    service: "Paiement frais académiques",
    formula: "Montant école + 5 %",
    ideal: "Accompagner le paiement d’une facture d’admission ou de scolarité.",
    action: "Payer mes frais",
  },
  {
    service: "Accompagnement visa / coaching",
    formula: "Sur devis",
    ideal: "Être accompagné sur Campus France, consulat, entretien et départ.",
    action: "Parler à un conseiller",
    whatsapp: true,
  },
];

const faqs = [
  {
    question: "Les tarifs sont-ils fixes ?",
    answer:
      "Certains services ont un tarif fixe, comme l’attestation d’hébergement. Les services liés à l’AVI, aux transferts ou aux frais académiques peuvent varier selon le montant, la devise, le pays, l’établissement et les exigences applicables.",
  },
  {
    question: "Le montant AVI est-il toujours le même ?",
    answer:
      "Non. Le montant de référence affiché est indicatif. Le montant final dépend du pays, de l’année universitaire, des exigences consulaires, du profil étudiant et des règles applicables au dossier.",
  },
  {
    question: "Puis-je choisir un montant AVI supérieur à 7 380 € ?",
    answer:
      "Oui. Le simulateur permet de saisir un montant supérieur lorsque le dossier, l’établissement ou la destination nécessite une capacité financière plus élevée.",
  },
  {
    question: "Le Canada est-il pris en charge ?",
    answer:
      "Oui. AVI CERTIFY présente une simulation Canada distincte en CAD, avec la même logique de frais de service et de frais de gestion indicatifs.",
  },
  {
    question: "Le taux FCFA est-il actualisé ?",
    answer:
      "Pas encore automatiquement. Le taux affiché est un taux indicatif à connecter prochainement à une source actualisée ou à des règles tarifaires administrables.",
  },
  {
    question: "Les frais de scolarité dépendent-ils de l’école ?",
    answer:
      "Oui. Les frais académiques dépendent de la facture émise par l’établissement. AVI CERTIFY peut accompagner le paiement et le suivi administratif lorsque le dossier le permet.",
  },
  {
    question: "Le paiement est-il sécurisé ?",
    answer:
      "Les paiements sont traités via des parcours sécurisés. AVI CERTIFY ne demande pas de transmettre des informations bancaires sensibles par messagerie libre.",
  },
  {
    question: "Puis-je parler à un conseiller avant de payer ?",
    answer:
      "Oui. Un échange WhatsApp peut permettre de qualifier le besoin, vérifier la cohérence du service choisi et orienter l’étudiant avant paiement.",
  },
  {
    question: "Comment vérifier une AVI ?",
    answer:
      "Une AVI vérifiable peut être contrôlée via le lien public sécurisé prévu à cet effet. Le service de vérification est accessible sur verify.avicertify.fr.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b bg-[hsl(222,75%,8%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(5,150,105,0.22),transparent_30%),radial-gradient(circle_at_78%_0%,rgba(249,200,70,0.13),transparent_26%)]" />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--institutional-yellow))]/35 bg-[hsl(var(--institutional-yellow))]/10 px-4 py-2 text-sm font-semibold text-[hsl(var(--institutional-yellow))]">
              <Landmark className="h-4 w-4" aria-hidden="true" />
              Tarification mobilité Canada / Europe
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Tarifs AVI CERTIFY
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
              Des services clairs pour préparer votre mobilité étudiante : attestation d’hébergement, AVI, paiement des frais académiques, accompagnement visa et mobilité Canada / Europe.
            </p>
            <p className="mt-5 text-sm font-semibold text-slate-200">
              Paiement sécurisé · Documents vérifiables · Support WhatsApp · Espace client sécurisé · Vérification AVI disponible
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" variant="cta" className="text-base" asChild>
                <AuthAwareLink
                  unauthenticatedHref="/inscription"
                  authenticatedHref="/dashboard"
                >
                  Commencer mon dossier
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </AuthAwareLink>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/5 text-white hover:bg-white/10"
                asChild
              >
                <a href={verifyAviUrl} target="_blank" rel="noopener noreferrer">
                  Vérifier une AVI
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30">
        <div className="container py-14 md:py-20">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-accent">
              Lecture transparente
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Une formule lisible avant engagement
            </h2>
          </div>
          <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.15fr]">
            {pricingFormula.map((item, index) => (
              <div key={item.label} className="contents">
                <div
                  className={`rounded-lg border p-6 shadow-sm ${
                    item.result
                      ? "border-accent/30 bg-primary text-white"
                      : "bg-background"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold uppercase tracking-normal ${
                      item.result ? "text-[hsl(var(--institutional-yellow))]" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-4 text-3xl font-semibold">{item.value}</p>
                </div>
                {index < pricingFormula.length - 1 ? (
                  <div className="hidden items-center text-3xl font-semibold text-accent lg:flex">
                    {index === pricingFormula.length - 2 ? "=" : "+"}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">
            Offres
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Choisissez le service adapté à votre dossier
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {offers.map((offer) => (
            <article
              key={offer.title}
              className={`rounded-lg border p-6 shadow-sm md:p-8 ${
                offer.highlighted
                  ? "border-accent/40 bg-primary text-white shadow-xl"
                  : "bg-background"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">{offer.title}</h3>
                  <p
                    className={`mt-3 text-3xl font-semibold ${
                      offer.highlighted ? "text-[hsl(var(--institutional-yellow))]" : "text-primary"
                    }`}
                  >
                    {offer.price}
                  </p>
                </div>
                {offer.highlighted ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--institutional-yellow))]/35 bg-[hsl(var(--institutional-yellow))]/10 px-3 py-1 text-xs font-semibold text-[hsl(var(--institutional-yellow))]">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    AVI vérifiable
                  </div>
                ) : null}
              </div>
              <p className={`mt-5 leading-7 ${offer.highlighted ? "text-slate-200" : "text-muted-foreground"}`}>
                {offer.description}
              </p>
              {offer.breakdown ? (
                <div className={`mt-6 rounded-lg border p-4 text-sm ${offer.highlighted ? "border-white/15 bg-white/10 text-slate-100" : "bg-muted/40 text-muted-foreground"}`}>
                  {offer.breakdown.map((line) => (
                    <p key={line} className="py-1">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
              <ul className="mt-6 grid gap-3">
                {offer.includes.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${offer.highlighted ? "text-accent-light" : "text-accent"}`} aria-hidden="true" />
                    <span className={offer.highlighted ? "text-slate-100" : "text-muted-foreground"}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button variant={offer.highlighted ? "cta" : "default"} asChild>
                  {offer.whatsapp ? (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      {offer.cta}
                    </a>
                  ) : (
                    <AuthAwareLink
                      unauthenticatedHref="/inscription"
                      authenticatedHref="/dossier/paiement"
                    >
                      {offer.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </AuthAwareLink>
                  )}
                </Button>
                {offer.secondaryVerify ? (
                  <Button
                    variant="outline"
                    className="border-white/35 bg-white/5 text-white hover:bg-white/10"
                    asChild
                  >
                    <a href={verifyAviUrl} target="_blank" rel="noopener noreferrer">
                      Vérifier une AVI
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <PricingSimulator />

      <section className="container py-16 md:py-24">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">
            Comparatif
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Vue rapide des services
          </h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div className="grid gap-px bg-border md:grid-cols-[1fr_1fr_1.4fr_0.9fr]">
            {["Service", "Prix / formule", "Idéal pour", "Action"].map((head) => (
              <div key={head} className="bg-primary px-5 py-4 text-sm font-semibold text-white">
                {head}
              </div>
            ))}
            {comparisonRows.map((row) => (
              <div key={row.service} className="contents">
                <div className="bg-background px-5 py-4 font-semibold">{row.service}</div>
                <div className="bg-background px-5 py-4 text-muted-foreground">{row.formula}</div>
                <div className="bg-background px-5 py-4 text-muted-foreground">{row.ideal}</div>
                <div className="bg-background px-5 py-4">
                  {row.whatsapp ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-accent hover:text-accent-dark"
                    >
                      {row.action}
                    </a>
                  ) : (
                    <AuthAwareLink
                      unauthenticatedHref="/inscription"
                      authenticatedHref="/dossier/paiement"
                      className="font-semibold text-accent hover:text-accent-dark"
                    >
                      {row.action}
                    </AuthAwareLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-normal text-accent">
              Questions fréquentes
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Tarifs, devis et vérification
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-lg border bg-background p-5 shadow-sm">
                <summary className="cursor-pointer text-base font-semibold text-primary">
                  {faq.question}
                </summary>
                <p className="mt-4 leading-7 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[hsl(222,75%,8%)] text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--institutional-yellow))]/70 to-transparent" />
        <div className="container relative py-16 text-center md:py-20">
          <ShieldCheck className="mx-auto h-10 w-10 text-accent-light" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Vous ne savez pas quel service choisir ?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-200">
            Notre équipe peut qualifier votre besoin, estimer votre budget et vous orienter vers le service adapté à votre dossier.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="cta" asChild>
              <AuthAwareLink unauthenticatedHref="/inscription" authenticatedHref="/dashboard">
                Commencer mon dossier
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AuthAwareLink>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Parler sur WhatsApp
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10" asChild>
              <a href={verifyAviUrl} target="_blank" rel="noopener noreferrer">
                <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                Vérifier une AVI
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
