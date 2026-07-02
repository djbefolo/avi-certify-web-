export type Service = {
  title: string;
  kicker: string;
  description: string;
  href: string;
  slug: string;
  detail: {
    objectiveTitle: string;
    objective: string;
    includes: string[];
    ctaLabel: string;
  };
};

export const services: Service[] = [
  {
    title: "Attestation de Virement Irrévocable",
    kicker: "AVI",
    description:
      "Préparez une preuve de fonds ou une AVI adaptée à votre projet : montant, devise, référence, cohérence du dossier et document vérifiable.",
    href: "/services/avi",
    slug: "avi",
    detail: {
      objectiveTitle: "Préparer une preuve de fonds claire et vérifiable",
      objective:
        "Ce service vous aide à préparer une preuve de fonds claire et vérifiable pour votre dossier de mobilité. AVI CERTIFY structure le montant, la devise, la référence, les informations du bénéficiaire et les justificatifs nécessaires. Lorsque les informations sont complètes et validées, la préparation peut être traitée rapidement, avec un objectif opérationnel de 24h.",
      includes: [
        "Analyse du montant demandé selon destination, école, visa ou projet de mobilité.",
        "Structuration de la preuve de fonds ou de l'Attestation de Virement Irrévocable.",
        "Vérification de cohérence entre fonds, devise, justificatifs et dossier.",
        "Préparation d'un document vérifiable avec référence unique lorsque le dossier le permet.",
        "Accompagnement par une équipe spécialisée jusqu'à la prochaine étape.",
      ],
      ctaLabel: "Demander une preuve de fonds",
    },
  },
  {
    title: "Attestation d'hébergement",
    kicker: "Hébergement",
    description:
      "Obtenez une attestation de logement à partir de 79 €, avec informations structurées, référence vérifiable et cohérence avec votre dossier visa ou installation.",
    href: "/services/hebergement",
    slug: "hebergement",
    detail: {
      objectiveTitle: "Présenter un logement cohérent avec votre parcours",
      objective:
        "AVI CERTIFY vous aide à obtenir une attestation de logement à partir de 79 €, utile pour structurer votre dossier visa, Campus France ou installation. L'objectif est de présenter une adresse cohérente avec votre projet, votre calendrier et votre destination.",
      includes: [
        "Collecte des informations nécessaires.",
        "Préparation d'une attestation de logement à partir de 79 €.",
        "Vérification de cohérence avec ville, durée, visa ou installation.",
        "Référence vérifiable lorsque le dossier le permet.",
        "Suivi humain jusqu'à la validation documentaire.",
      ],
      ctaLabel: "Obtenir une attestation de logement",
    },
  },
  {
    title: "Préfinancement étudiant",
    kicker: "Financement",
    description:
      "Évaluez votre besoin financier, structurez votre preuve de fonds et préparez votre parcours de préfinancement selon votre destination, votre devise et votre profil.",
    href: "/services/prefinancement",
    slug: "prefinancement",
    detail: {
      objectiveTitle: "Structurer le financement et les paiements de mobilité",
      objective:
        "AVI CERTIFY vous aide à estimer et structurer le financement de votre mobilité : preuve de fonds, AVI, devise, paiement de frais de scolarité, transferts internationaux et options de préfinancement selon votre profil. Exemple : organiser le paiement de frais de scolarité au Canada lorsque les fonds disponibles sont en Franc CFA au Cameroun.",
      includes: [
        "Analyse du besoin financier réel.",
        "Simulation du montant à mobiliser.",
        "Structuration de la preuve de fonds.",
        "Préparation du paiement de frais de scolarité ou d'un virement international selon les corridors disponibles.",
        "Accompagnement pour les situations multi-devises, notamment Franc CFA, EUR et CAD.",
        "Orientation vers la prochaine étape selon le dossier.",
      ],
      ctaLabel: "Évaluer mon besoin financier",
    },
  },
  {
    title: "Accompagnement visa",
    kicker: "Visa",
    description:
      "Préparez un dossier visa ou Campus France plus cohérent : financement, hébergement, justificatifs, calendrier, pièces clés et suivi consulaire.",
    href: "/services/accompagnement-visa",
    slug: "accompagnement-visa",
    detail: {
      objectiveTitle: "Sécuriser la cohérence du dossier visa",
      objective:
        "L'accompagnement visa ne se limite pas à une liste de pièces. AVI CERTIFY vérifie la cohérence entre votre projet, vos fonds, votre hébergement, vos paiements, vos documents et votre calendrier consulaire, sans promettre l'obtention d'un visa.",
      includes: [
        "Revue des pièces clés.",
        "Vérification financement, hébergement et calendrier.",
        "Préparation Campus France ou consulaire.",
        "Identification des incohérences qui peuvent fragiliser le dossier.",
        "Suivi par une équipe spécialisée jusqu'à la prochaine étape.",
      ],
      ctaLabel: "Préparer mon dossier visa",
    },
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
