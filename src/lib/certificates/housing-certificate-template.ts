import type { HousingInventoryAddress } from "@/lib/housing/housing-regions";

export type HousingCertificateTemplateData = {
  certificateNumber: string;
  studentFullName: string;
  dateOfBirth: string;
  birthPlace: string;
  nationality: string;
  targetSchoolName: string | null;
  housing: HousingInventoryAddress;
  entryDate: string;
  durationMonths: number;
  issueDate: string;
  verificationUrl: string;
};

function getStudentIdentityText(data: HousingCertificateTemplateData) {
  return `${data.studentFullName}, né(e) le ${data.dateOfBirth} à ${data.birthPlace}, de nationalité ${data.nationality}, bénéficiera d’un hébergement dans l’un des logements proposés par AVI CERTIFY, situé à l’adresse suivante :`;
}

export function getHousingCertificateParagraphs(
  data: HousingCertificateTemplateData,
) {
  return [
    "AVI CERTIFY est une société par actions simplifiée au capital social de 10 000 euros, spécialisée dans l’accompagnement des étudiants internationaux dans leurs démarches administratives, financières et leur installation étudiante en France.",
    "Nous soussignés, AVI CERTIFY, société par actions simplifiée immatriculée au RCS de Besançon sous le numéro 942 370 545, dont le siège social est situé 75 Rue de Besançon, 25300 Pontarlier (France), agissant en qualité de Courtier en Opérations de Banque et Services de Paiement (COBSP), enregistré à l’ORIAS sous le n° 25005516 – www.orias.fr, attestons sur l’honneur que :",
    getStudentIdentityText(data),
    data.housing.fullAddress,
    `Ville : ${data.housing.city}.`,
    `au loyer mensuel de ${data.housing.rent} €.`,
    ...(data.targetSchoolName
      ? [`Établissement visé : ${data.targetSchoolName}.`]
      : []),
    `La date d’entrée envisagée est le ${data.entryDate}, avec une durée de location estimée de ${data.durationMonths} mois, dans des conditions normales d’installation et sous réserve de disponibilité au moment de l’entrée dans les lieux.`,
    "Cette attestation est délivrée à la demande de l’intéressé(e) afin de compléter son dossier administratif, notamment dans le cadre d’une demande de visa étudiant.",
    "Nous restons à votre disposition pour tout complément d’information.",
    "Ce document ne peut être revendu.",
  ];
}
