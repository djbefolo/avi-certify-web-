import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "À propos d'AVI CERTIFY",
  description:
    "Découvrez AVI CERTIFY, une plateforme d'accompagnement pour rendre les démarches AVI, documents financiers et visa étudiant plus lisibles.",
  path: "/a-propos",
});

export default function AboutPage() {
  const pillars = [
    {
      title: "Mission",
      text: "Simplifier les démarches financières et documentaires des étudiants qui préparent une mobilité internationale.",
    },
    {
      title: "Vision",
      text: "Créer une plateforme fiable où chaque étudiant peut suivre son dossier et comprendre les prochaines étapes.",
    },
    {
      title: "Confiance",
      text: "Mettre l'accent sur la clarté, la conformité et la protection des informations sensibles.",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="À propos"
        title="AVI CERTIFY accompagne les étudiants dans les étapes sensibles de leur mobilité."
        description="Notre mission est de rendre les démarches financières, documentaires et visa plus lisibles pour les étudiants et leurs familles."
      />
      <section className="container grid gap-6 py-12 md:grid-cols-3 lg:py-16">
        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-md border p-5">
            <h2 className="text-xl font-semibold">{pillar.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              {pillar.text}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
