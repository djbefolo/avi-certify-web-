export type Service = {
  title: string;
  kicker: string;
  description: string;
  href: string;
  slug: string;
  priceLabel: string;
  delay: string;
  detail: {
    objectiveTitle: string;
    objective: string;
    includes: string[];
    ctaLabel: string;
    /** "transactional" services link straight to signup/checkout; "consultative" ones start a conversation first. */
    ctaKind: "transactional" | "consultative";
  };
};

const guaranteeText =
  "Votre dossier est protégé : en cas de refus de visa, les frais de ce service vous sont remboursés intégralement et sans condition, sous 24 heures.";

export const services: Service[] = [
  {
    title: "Attestation de Virement Irrévocable",
    kicker: "AVI",
    description:
      "Vous devez justifier la disponibilité de vos fonds pour votre dossier d'études ou de visa. AVI CERTIFY structure le montant, la devise et les justificatifs pour préparer un document vérifiable.",
    href: "/services/avi",
    slug: "avi",
    priceLabel: "À partir de 8 098,30 € indicatif",
    delay: "Objectif opérationnel : 24h une fois le dossier complet",
    detail: {
      objectiveTitle: "Vous devez justifier vos ressources pour votre dossier ?",
      objective:
        "Vous préparez un dossier d'études ou de visa et devez démontrer que vos ressources sont suffisantes et cohérentes avec votre projet. AVI CERTIFY structure le montant, la devise, la référence, les informations du bénéficiaire et les justificatifs nécessaires pour préparer une preuve de fonds claire et vérifiable. Lorsque votre dossier est complet, l'objectif opérationnel est de 24h.",
      includes: [
        "Analyse du montant demandé selon votre destination, votre école ou votre visa.",
        "Structuration de votre preuve de fonds ou de votre Attestation de Virement Irrévocable.",
        "Vérification de cohérence entre vos fonds, votre devise, vos justificatifs et votre dossier.",
        "Un document vérifiable avec référence unique et QR code, dès que le dossier le permet.",
        "Un conseiller disponible jusqu'à la prochaine étape de votre dossier.",
      ],
      ctaLabel: "Demander ma preuve de fonds",
      ctaKind: "transactional",
    },
  },
  {
    title: "Attestation d'hébergement",
    kicker: "Hébergement",
    description:
      "Vous avez besoin d'une preuve de logement cohérente pour votre dossier visa, Campus France ou votre installation. Attestation sécurisée, vérifiable par QR code, à partir de 99 €.",
    href: "/services/hebergement",
    slug: "hebergement",
    priceLabel: "99 €",
    delay: "24 à 48h ouvrées après validation du paiement et des documents",
    detail: {
      objectiveTitle: "Vous avez besoin d'une preuve de logement pour votre dossier ?",
      objective:
        "Que vous ayez déjà un logement ou que vous prépariez votre installation, AVI CERTIFY vous aide à obtenir une attestation d'hébergement à partir de 99 €, cohérente avec votre ville, votre calendrier et votre dossier visa ou Campus France. Le document est sécurisé et vérifiable : chaque attestation porte un QR code et un lien public de vérification, conçus pour limiter les falsifications et permettre un contrôle rapide de son authenticité.",
      includes: [
        "Collecte des informations nécessaires à votre dossier.",
        "Préparation d'une attestation de logement à partir de 99 €.",
        "Vérification de cohérence avec votre ville, votre durée de séjour et votre visa.",
        "QR code et lien public de vérification sur chaque document.",
        "Suivi humain jusqu'à la validation de votre document.",
      ],
      ctaLabel: "Obtenir mon attestation de logement",
      ctaKind: "transactional",
    },
  },
  {
    title: "Préfinancement étudiant",
    kicker: "Financement",
    description:
      "Vous ne savez pas comment financer votre installation ou payer vos frais depuis l'étranger ? AVI CERTIFY évalue votre besoin réel et s'appuie sur de vrais partenaires financiers pour structurer une solution adaptée.",
    href: "/services/prefinancement",
    slug: "prefinancement",
    priceLabel: "Sur devis, selon votre besoin",
    delay: "Variable selon le dossier et le corridor de financement",
    detail: {
      objectiveTitle: "Vous ne savez pas comment financer votre installation ?",
      objective:
        "Que vos fonds soient en Franc CFA, en euros ou en dollars canadiens, AVI CERTIFY vous aide à évaluer votre besoin réel, structurer votre preuve de fonds et organiser vos paiements internationaux — par exemple régler des frais de scolarité au Canada avec des fonds disponibles au Cameroun. AVI CERTIFY s'appuie sur des partenariats réels avec des acteurs financiers pour faciliter certaines solutions de préfinancement et de crédit à la consommation étudiant ; l'éligibilité reste soumise à l'étude individuelle de chaque dossier.",
      includes: [
        "Analyse de votre besoin financier réel.",
        "Simulation du montant à mobiliser.",
        "Structuration de votre preuve de fonds.",
        "Paiement de frais de scolarité ou virement international selon les corridors disponibles.",
        "Accompagnement pour les situations multi-devises (Franc CFA, EUR, CAD notamment).",
        "Orientation vers un partenaire financier lorsque votre dossier est éligible.",
      ],
      ctaLabel: "Évaluer mon besoin financier",
      ctaKind: "consultative",
    },
  },
  {
    title: "Accompagnement visa",
    kicker: "Visa",
    description:
      "Vous préparez un dossier Campus France ou un rendez-vous consulaire et le moindre manque peut le retarder. AVI CERTIFY vérifie la cohérence de votre dossier, financement à hébergement inclus.",
    href: "/services/accompagnement-visa",
    slug: "accompagnement-visa",
    priceLabel: "Sur devis",
    delay: "Selon le calendrier consulaire, coordonné avec votre conseiller",
    detail: {
      objectiveTitle: "Vous préparez un dossier Campus France ou un rendez-vous consulaire ?",
      objective:
        "Le moindre manque ou la moindre incohérence peut retarder votre projet. AVI CERTIFY vérifie la cohérence entre votre projet, vos fonds, votre hébergement, vos paiements, vos documents et votre calendrier consulaire — sans jamais promettre l'obtention d'un visa, qui reste une décision exclusive des autorités consulaires. En cas de refus, vos frais de service sont remboursés intégralement.",
      includes: [
        "Revue complète de vos pièces clés.",
        "Vérification du financement, de l'hébergement et du calendrier.",
        "Préparation Campus France ou consulaire.",
        "Identification des incohérences qui peuvent fragiliser votre dossier.",
        "Un conseiller disponible par WhatsApp jusqu'à la prochaine étape.",
      ],
      ctaLabel: "Préparer mon dossier visa",
      ctaKind: "consultative",
    },
  },
];

export const serviceGuaranteeText = guaranteeText;

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
