import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Comment fonctionne l'accompagnement AVI CERTIFY",
  description:
    "Comprenez les étapes du suivi de dossier étudiant : qualification, création du dossier, documents, paiement, vérification et accompagnement.",
  path: "/comment-ca-marche",
});

const steps = [
  "Qualification du besoin",
  "Création du dossier",
  "Dépôt des pièces",
  "Paiement ou dépôt",
  "Vérification et émission",
  "Suivi jusqu'au départ",
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Parcours"
        title="Un suivi simple, étape par étape."
        description="Le parcours AVI CERTIFY aide l'étudiant à savoir quoi faire, quand le faire et comment vérifier l'avancement du dossier."
      />
      <section className="container grid gap-3 py-12 md:grid-cols-2 lg:grid-cols-3 lg:py-16">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border p-5">
            <span className="text-sm font-semibold text-accent">
              Étape {index + 1}
            </span>
            <h2 className="mt-3 text-xl font-semibold">{step}</h2>
          </div>
        ))}
      </section>
    </>
  );
}
