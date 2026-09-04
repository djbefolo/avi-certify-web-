import { FileText } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHeader } from "@/components/marketing/page-header";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/seo/metadata";
import { GUIDE_FRANCE_2026_RESOURCE_ID } from "@/lib/resources/guide-resource";
import { faqPageJsonLd } from "@/lib/seo/schema";

export const metadata = createPageMetadata({
  title: "FAQ AVI étudiant, hébergement et visa",
  description:
    "Réponses aux questions fréquentes sur l'AVI étudiant, les documents, l'attestation d'hébergement, le préfinancement et le visa étudiant.",
  path: "/faq",
});

const faqs = [
  {
    question: "Qu'est-ce qu'une AVI ?",
    answer:
      "C'est une attestation utilisée pour justifier la disponibilité de fonds dans certaines démarches d'études et de visa.",
  },
  {
    question: "Que se passe-t-il si mon visa est refusé ?",
    answer:
      "Vous êtes remboursé intégralement et sans condition des frais de service liés à votre dossier, sur simple présentation du refus émis par les autorités consulaires. Le remboursement est traité sous 24 heures. Cette garantie est adossée à notre assurance Responsabilité Civile Professionnelle (800 000 €) et à notre garantie financière (115 000 €) — voir nos Conditions Générales de Vente.",
  },
  {
    question: "Comment vérifier l'authenticité d'une attestation AVI CERTIFY ?",
    answer:
      "Chaque attestation comporte un QR code et un lien public de vérification. Vous pouvez contrôler son authenticité à tout moment sur verify.avicertify.fr.",
  },
  {
    question: "Quels documents faut-il fournir ?",
    answer:
      "La liste dépend du pays visé et du service choisi. Un conseiller vous indique précisément les pièces à préparer après qualification de votre dossier.",
  },
  {
    question: "Quel est le délai de traitement ?",
    answer:
      "Les attestations et documents sont généralement émis sous 24 à 48 heures ouvrées après validation du paiement et réception de l'ensemble des pièces requises. L'accompagnement visa suit en complément le calendrier propre au consulat.",
  },
  {
    question: "Comment se passe le paiement ?",
    answer:
      "Le paiement s'effectue en ligne via Stripe, notre prestataire sécurisé. AVI CERTIFY ne conserve et ne demande jamais vos informations bancaires par messagerie libre.",
  },
  {
    question: "Mes données personnelles sont-elles sécurisées ?",
    answer:
      "Oui. Vos données sont traitées conformément au RGPD et à notre politique de confidentialité, dans un espace client authentifié et chiffré.",
  },
  {
    question: "Le financement est-il garanti pour tous les étudiants ?",
    answer:
      "Non. AVI CERTIFY s'appuie sur des partenariats réels avec des acteurs financiers pour faciliter certaines solutions de préfinancement et de crédit à la consommation étudiant, mais l'éligibilité reste soumise à étude individuelle du dossier — aucune banque ne garantit un financement automatique.",
  },
  {
    question: "Proposez-vous un accompagnement visa ?",
    answer:
      "Oui, AVI CERTIFY peut accompagner la préparation des pièces et les étapes liées au parcours visa étudiant, sans jamais promettre l'obtention du visa lui-même — cette décision appartient aux autorités consulaires.",
  },
  {
    question: "Qui puis-je contacter en cas de problème ?",
    answer:
      "Notre équipe répond par WhatsApp et par email (contact@avicertify.fr), avec un objectif de réponse sous 24h ouvrées, à chaque étape de votre dossier — y compris avant et pendant le paiement.",
  },
  {
    question: "Comment recevoir le guide gratuit AVI CERTIFY ?",
    answer:
      "Le guide est accessible après création de compte AVI CERTIFY. Cela nous permet de mieux comprendre votre projet, votre pays de destination et vos besoins d’accompagnement avant de vous orienter vers les bonnes ressources.",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqs)} />
      <PageHeader
        eyebrow="FAQ"
        title="Les premières réponses avant de démarrer."
        description="Les questions récurrentes sur l'AVI, l'hébergement, le préfinancement et le visa étudiant."
      />

      <section className="container pt-10">
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
              <FileText className="h-6 w-6 text-accent" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-accent">
                Guide premium AVI CERTIFY
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Guide 2026 – Réussir son installation en France
              </h2>
              <p className="mt-2 font-medium text-primary">
                Comment éviter les 7 erreurs qui détruisent un projet d’études
                en France !
              </p>
              <p className="mt-3 leading-7 text-muted-foreground">
                Recevez notre guide premium pour mieux préparer votre arrivée :
                démarches administratives, logement, santé, banque, budget,
                transport et erreurs fréquentes à éviter.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Le guide est accessible après création de compte afin de mieux
                personnaliser votre accompagnement.
              </p>
            </div>
            <Button className="md:justify-self-end" variant="cta" asChild>
              <Link href={`/inscription?resource=${GUIDE_FRANCE_2026_RESOURCE_ID}`}>
                Créer mon compte et recevoir le guide
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container grid gap-3 py-12 lg:py-16">
        {faqs.map((item) => (
          <article key={item.question} className="rounded-md border p-5">
            <h2 className="text-lg font-semibold">{item.question}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {item.answer}
            </p>
          </article>
        ))}
      </section>
    </>
  );
}
