import { JsonLd } from "@/components/seo/json-ld";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";
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
    question: "Quels documents faut-il fournir ?",
    answer:
      "La liste dépend du pays visé et du service choisi. Un conseiller vous indique les pièces à préparer après qualification.",
  },
  {
    question: "Quel est le délai de traitement ?",
    answer:
      "Le délai dépend de la complétude du dossier, du service demandé et des vérifications nécessaires.",
  },
  {
    question: "Comment se passe le paiement ?",
    answer:
      "Les modalités de paiement sont confirmées avant validation afin de garder une trace claire du dossier.",
  },
  {
    question: "Proposez-vous un accompagnement visa ?",
    answer:
      "Oui, AVI CERTIFY peut accompagner la préparation des pièces et les étapes liées au parcours visa étudiant.",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(faqs)} />
      <PageHeader
        eyebrow="FAQ"
        title="Les premières réponses avant de démarrer."
        description="Cette page centralisera les questions récurrentes sur l'AVI, l'hébergement, le préfinancement et le visa."
      />
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
