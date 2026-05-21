import type { HousingAddress } from "@/lib/housing/housing-addresses";

export type HousingCertificateTemplateData = {
  certificateNumber: string;
  studentFullName: string;
  dateOfBirth: string;
  birthPlace: string;
  housing: HousingAddress;
  entryDate: string;
  durationMonths: number;
  issueDate: string;
  verificationUrl: string;
};

export function getHousingCertificateParagraphs(
  data: HousingCertificateTemplateData,
) {
  return [
    "AVI CERTIFY est une société par actions simplifiée au capital social de 10 000 euros, spécialisée dans l’accompagnement des étudiants internationaux dans leurs démarches administratives, financières et leur installation en France.",
    "Je soussigné,",
    "BEFOLO NKOA Gabriel, Emmanuel, président de la société AVI CERTIFY, dont le siège social est situé au 75 Rue de Besançon, 25300 Pontarlier, inscrite au R.C.S. de Besançon sous le numéro 101 528 123 et immatriculée à l’ORIAS sous le numéro [XXXXXX], atteste sur l'honneur que :",
    `${data.studentFullName}, né(e) le ${data.dateOfBirth} à ${data.birthPlace}, logera dans l’un des logements proposés par AVI CERTIFY situé à l’adresse suivante :`,
    data.housing.address,
    `au loyer mensuel de ${data.housing.rent} €.`,
    `La date d’entrée envisagée est le ${data.entryDate}, avec une durée de location estimée de ${data.durationMonths} mois, dans des conditions normales d’installation et sous réserve de disponibilité au moment de l’entrée dans les lieux.`,
    "Cette attestation est délivrée à la demande de l’intéressé(e) afin de compléter son dossier administratif, notamment dans le cadre d’une demande de visa étudiant.",
    "Nous restons à votre disposition pour tout complément d’information.",
    "Ce document ne peut être revendu.",
  ];
}
