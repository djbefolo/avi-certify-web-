export type Service = {
  title: string;
  kicker: string;
  description: string;
  href: string;
  slug: string;
};

export const services: Service[] = [
  {
    title: "Attestation de Virement Irrévocable",
    kicker: "AVI",
    description:
      "Préparation du dossier financier demandé dans les démarches d'études et de visa.",
    href: "/services/avi",
    slug: "avi",
  },
  {
    title: "Attestation d'hébergement",
    kicker: "Hébergement",
    description:
      "Accompagnement pour présenter une adresse et un justificatif cohérents avec le dossier.",
    href: "/services/hebergement",
    slug: "hebergement",
  },
  {
    title: "Préfinancement étudiant",
    kicker: "Financement",
    description:
      "Qualification du besoin et préparation du parcours de préfinancement selon le profil.",
    href: "/services/prefinancement",
    slug: "prefinancement",
  },
  {
    title: "Accompagnement visa",
    kicker: "Visa",
    description:
      "Aide à la préparation Campus France, au contrôle des pièces et au suivi consulaire.",
    href: "/services/accompagnement-visa",
    slug: "accompagnement-visa",
  },
];

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug);
}
