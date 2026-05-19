export const residenceCountryValues = [
  "cameroun",
  "cote-ivoire",
  "senegal",
  "mali",
  "guinee",
  "gabon",
  "congo",
  "rdc",
  "togo",
  "benin",
  "burkina-faso",
  "maroc",
  "tunisie",
  "autre",
] as const;

export const residenceCountryOptions = [
  { value: "cameroun", label: "Cameroun" },
  { value: "cote-ivoire", label: "Côte d'Ivoire" },
  { value: "senegal", label: "Sénégal" },
  { value: "mali", label: "Mali" },
  { value: "guinee", label: "Guinée" },
  { value: "gabon", label: "Gabon" },
  { value: "congo", label: "Congo" },
  { value: "rdc", label: "RDC" },
  { value: "togo", label: "Togo" },
  { value: "benin", label: "Bénin" },
  { value: "burkina-faso", label: "Burkina Faso" },
  { value: "maroc", label: "Maroc" },
  { value: "tunisie", label: "Tunisie" },
  { value: "autre", label: "Autre" },
] as const;

export const destinationCountryValues = [
  "france",
  "allemagne",
  "belgique",
  "italie",
  "espagne",
  "canada",
  "autre",
] as const;

export const destinationCountryOptions = [
  { value: "france", label: "France" },
  { value: "allemagne", label: "Allemagne" },
  { value: "belgique", label: "Belgique" },
  { value: "italie", label: "Italie" },
  { value: "espagne", label: "Espagne" },
  { value: "canada", label: "Canada" },
  { value: "autre", label: "Autre" },
] as const;

export const requestedServiceValues = [
  "avi",
  "hebergement",
  "prefinancement",
  "accompagnement-visa",
  "autre",
] as const;

export const requestedServiceOptions = [
  { value: "avi", label: "Attestation de Virement Irrévocable" },
  { value: "hebergement", label: "Attestation d'hébergement" },
  { value: "prefinancement", label: "Préfinancement étudiant" },
  { value: "accompagnement-visa", label: "Accompagnement visa" },
  { value: "autre", label: "Je ne sais pas encore" },
] as const;
