export type HousingCertificateAddress = {
  region?: string;
  city: string;
  fullAddress: string;
  rent: number;
  available?: boolean;
};

export type HousingCertificateTemplateData = {
  certificateNumber: string;
  studentFullName: string;
  dateOfBirth: string;
  birthPlace: string;
  nationality: string;
  targetSchoolName: string | null;
  housing: HousingCertificateAddress;
  entryDate: string;
  durationMonths: number;
  issueDate: string;
  validUntil?: string | null;
  verificationUrl: string;
  templateVersion?: string;
};

function getStudentIdentityText(data: HousingCertificateTemplateData) {
  return `${data.studentFullName}, ne(e) le ${data.dateOfBirth} a ${data.birthPlace}, de nationalite ${data.nationality}, beneficie d'une proposition conditionnelle de logement dans le cadre de son projet d'etudes en France.`;
}

export function getHousingCertificateParagraphs(
  data: HousingCertificateTemplateData,
) {
  return [
    "AVI CERTIFY est une societe par actions simplifiee au capital social de 10 000 euros, specialisee dans l'accompagnement des etudiants internationaux dans leurs demarches administratives, financieres et leur installation etudiante en France.",
    "Nous soussignes, AVI CERTIFY, societe par actions simplifiee immatriculee au RCS de Besancon sous le numero 942 370 545, dont le siege social est situe 75 Rue de Besancon, 25300 Pontarlier (France), agissant en qualite de Courtier en Operations de Banque et Services de Paiement (COBSP), enregistre a l'ORIAS sous le numero 25005516 - www.orias.fr, attestons que :",
    getStudentIdentityText(data),
    `Solution proposee, sous reserve de disponibilite : ${data.housing.fullAddress}`,
    `Ville : ${data.housing.city}. Loyer mensuel indicatif : ${data.housing.rent} EUR.`,
    ...(data.targetSchoolName
      ? [`Etablissement vise : ${data.targetSchoolName}.`]
      : []),
    `La date d'entree envisagee est le ${data.entryDate}, pour une duree estimee de ${data.durationMonths} mois. Toute entree effective dans les lieux reste soumise a la disponibilite, aux conditions contractuelles et aux validations requises.`,
    "Cette attestation est conditionnelle. L'adresse ou le logement propose peut etre remplace par une solution equivalente en cas d'indisponibilite. Elle ne constitue ni un bail definitif, ni une attribution irrevocable, ni une garantie de visa ou d'acceptation par une administration.",
    "Ce document est emis afin d'accompagner le dossier administratif ou de visa etudiant. Il n'est pas destine a la revente. Son authenticite et son statut peuvent etre verifies au moyen du QR code ou de l'URL de verification AVI CERTIFY.",
    ...(data.validUntil
      ? [`Validite conditionnelle du document : jusqu'au ${data.validUntil}.`]
      : []),
  ];
}
