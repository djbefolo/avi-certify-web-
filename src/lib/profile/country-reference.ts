export type CountryReference = {
  codeAlpha2: string;
  codeAlpha3: string;
  label: string;
};

export type NationalityReference = {
  countryCodeAlpha2: string;
  countryCodeAlpha3: string;
  label: string;
};

type CountryDefinition = CountryReference & {
  nationalityLabel: string;
};

export const countryDefinitions = [
  { codeAlpha2: "AF", codeAlpha3: "AFG", label: "Afghanistan", nationalityLabel: "Afghane" },
  { codeAlpha2: "ZA", codeAlpha3: "ZAF", label: "Afrique du Sud", nationalityLabel: "Sud-africaine" },
  { codeAlpha2: "AL", codeAlpha3: "ALB", label: "Albanie", nationalityLabel: "Albanaise" },
  { codeAlpha2: "DZ", codeAlpha3: "DZA", label: "Algérie", nationalityLabel: "Algérienne" },
  { codeAlpha2: "DE", codeAlpha3: "DEU", label: "Allemagne", nationalityLabel: "Allemande" },
  { codeAlpha2: "AD", codeAlpha3: "AND", label: "Andorre", nationalityLabel: "Andorrane" },
  { codeAlpha2: "AO", codeAlpha3: "AGO", label: "Angola", nationalityLabel: "Angolaise" },
  { codeAlpha2: "SA", codeAlpha3: "SAU", label: "Arabie saoudite", nationalityLabel: "Saoudienne" },
  { codeAlpha2: "AR", codeAlpha3: "ARG", label: "Argentine", nationalityLabel: "Argentine" },
  { codeAlpha2: "AM", codeAlpha3: "ARM", label: "Arménie", nationalityLabel: "Arménienne" },
  { codeAlpha2: "AU", codeAlpha3: "AUS", label: "Australie", nationalityLabel: "Australienne" },
  { codeAlpha2: "AT", codeAlpha3: "AUT", label: "Autriche", nationalityLabel: "Autrichienne" },
  { codeAlpha2: "BE", codeAlpha3: "BEL", label: "Belgique", nationalityLabel: "Belge" },
  { codeAlpha2: "BJ", codeAlpha3: "BEN", label: "Bénin", nationalityLabel: "Béninoise" },
  { codeAlpha2: "BR", codeAlpha3: "BRA", label: "Brésil", nationalityLabel: "Brésilienne" },
  { codeAlpha2: "BG", codeAlpha3: "BGR", label: "Bulgarie", nationalityLabel: "Bulgare" },
  { codeAlpha2: "BF", codeAlpha3: "BFA", label: "Burkina Faso", nationalityLabel: "Burkinabè" },
  { codeAlpha2: "BI", codeAlpha3: "BDI", label: "Burundi", nationalityLabel: "Burundaise" },
  { codeAlpha2: "CM", codeAlpha3: "CMR", label: "Cameroun", nationalityLabel: "Camerounaise" },
  { codeAlpha2: "CA", codeAlpha3: "CAN", label: "Canada", nationalityLabel: "Canadienne" },
  { codeAlpha2: "CV", codeAlpha3: "CPV", label: "Cap-Vert", nationalityLabel: "Cap-verdienne" },
  { codeAlpha2: "CF", codeAlpha3: "CAF", label: "Centrafrique", nationalityLabel: "Centrafricaine" },
  { codeAlpha2: "CL", codeAlpha3: "CHL", label: "Chili", nationalityLabel: "Chilienne" },
  { codeAlpha2: "CN", codeAlpha3: "CHN", label: "Chine", nationalityLabel: "Chinoise" },
  { codeAlpha2: "CO", codeAlpha3: "COL", label: "Colombie", nationalityLabel: "Colombienne" },
  { codeAlpha2: "KM", codeAlpha3: "COM", label: "Comores", nationalityLabel: "Comorienne" },
  { codeAlpha2: "CG", codeAlpha3: "COG", label: "Congo", nationalityLabel: "Congolaise (Congo)" },
  { codeAlpha2: "CI", codeAlpha3: "CIV", label: "Côte d'Ivoire", nationalityLabel: "Ivoirienne" },
  { codeAlpha2: "HR", codeAlpha3: "HRV", label: "Croatie", nationalityLabel: "Croate" },
  { codeAlpha2: "DK", codeAlpha3: "DNK", label: "Danemark", nationalityLabel: "Danoise" },
  { codeAlpha2: "DJ", codeAlpha3: "DJI", label: "Djibouti", nationalityLabel: "Djiboutienne" },
  { codeAlpha2: "EG", codeAlpha3: "EGY", label: "Égypte", nationalityLabel: "Égyptienne" },
  { codeAlpha2: "AE", codeAlpha3: "ARE", label: "Émirats arabes unis", nationalityLabel: "Émirienne" },
  { codeAlpha2: "ES", codeAlpha3: "ESP", label: "Espagne", nationalityLabel: "Espagnole" },
  { codeAlpha2: "US", codeAlpha3: "USA", label: "États-Unis", nationalityLabel: "Américaine" },
  { codeAlpha2: "ET", codeAlpha3: "ETH", label: "Éthiopie", nationalityLabel: "Éthiopienne" },
  { codeAlpha2: "FI", codeAlpha3: "FIN", label: "Finlande", nationalityLabel: "Finlandaise" },
  { codeAlpha2: "FR", codeAlpha3: "FRA", label: "France", nationalityLabel: "Française" },
  { codeAlpha2: "GA", codeAlpha3: "GAB", label: "Gabon", nationalityLabel: "Gabonaise" },
  { codeAlpha2: "GM", codeAlpha3: "GMB", label: "Gambie", nationalityLabel: "Gambienne" },
  { codeAlpha2: "GH", codeAlpha3: "GHA", label: "Ghana", nationalityLabel: "Ghanéenne" },
  { codeAlpha2: "GR", codeAlpha3: "GRC", label: "Grèce", nationalityLabel: "Grecque" },
  { codeAlpha2: "GN", codeAlpha3: "GIN", label: "Guinée", nationalityLabel: "Guinéenne" },
  { codeAlpha2: "GW", codeAlpha3: "GNB", label: "Guinée-Bissau", nationalityLabel: "Bissau-guinéenne" },
  { codeAlpha2: "GQ", codeAlpha3: "GNQ", label: "Guinée équatoriale", nationalityLabel: "Équato-guinéenne" },
  { codeAlpha2: "HT", codeAlpha3: "HTI", label: "Haïti", nationalityLabel: "Haïtienne" },
  { codeAlpha2: "IN", codeAlpha3: "IND", label: "Inde", nationalityLabel: "Indienne" },
  { codeAlpha2: "IE", codeAlpha3: "IRL", label: "Irlande", nationalityLabel: "Irlandaise" },
  { codeAlpha2: "IT", codeAlpha3: "ITA", label: "Italie", nationalityLabel: "Italienne" },
  { codeAlpha2: "JP", codeAlpha3: "JPN", label: "Japon", nationalityLabel: "Japonaise" },
  { codeAlpha2: "KE", codeAlpha3: "KEN", label: "Kenya", nationalityLabel: "Kényane" },
  { codeAlpha2: "LB", codeAlpha3: "LBN", label: "Liban", nationalityLabel: "Libanaise" },
  { codeAlpha2: "LU", codeAlpha3: "LUX", label: "Luxembourg", nationalityLabel: "Luxembourgeoise" },
  { codeAlpha2: "MG", codeAlpha3: "MDG", label: "Madagascar", nationalityLabel: "Malgache" },
  { codeAlpha2: "ML", codeAlpha3: "MLI", label: "Mali", nationalityLabel: "Malienne" },
  { codeAlpha2: "MA", codeAlpha3: "MAR", label: "Maroc", nationalityLabel: "Marocaine" },
  { codeAlpha2: "MU", codeAlpha3: "MUS", label: "Maurice", nationalityLabel: "Mauricienne" },
  { codeAlpha2: "MR", codeAlpha3: "MRT", label: "Mauritanie", nationalityLabel: "Mauritanienne" },
  { codeAlpha2: "MX", codeAlpha3: "MEX", label: "Mexique", nationalityLabel: "Mexicaine" },
  { codeAlpha2: "NE", codeAlpha3: "NER", label: "Niger", nationalityLabel: "Nigérienne" },
  { codeAlpha2: "NG", codeAlpha3: "NGA", label: "Nigeria", nationalityLabel: "Nigériane" },
  { codeAlpha2: "NO", codeAlpha3: "NOR", label: "Norvège", nationalityLabel: "Norvégienne" },
  { codeAlpha2: "NL", codeAlpha3: "NLD", label: "Pays-Bas", nationalityLabel: "Néerlandaise" },
  { codeAlpha2: "PL", codeAlpha3: "POL", label: "Pologne", nationalityLabel: "Polonaise" },
  { codeAlpha2: "PT", codeAlpha3: "PRT", label: "Portugal", nationalityLabel: "Portugaise" },
  { codeAlpha2: "CD", codeAlpha3: "COD", label: "République démocratique du Congo", nationalityLabel: "Congolaise (RDC)" },
  { codeAlpha2: "RO", codeAlpha3: "ROU", label: "Roumanie", nationalityLabel: "Roumaine" },
  { codeAlpha2: "GB", codeAlpha3: "GBR", label: "Royaume-Uni", nationalityLabel: "Britannique" },
  { codeAlpha2: "RW", codeAlpha3: "RWA", label: "Rwanda", nationalityLabel: "Rwandaise" },
  { codeAlpha2: "SN", codeAlpha3: "SEN", label: "Sénégal", nationalityLabel: "Sénégalaise" },
  { codeAlpha2: "CH", codeAlpha3: "CHE", label: "Suisse", nationalityLabel: "Suisse" },
  { codeAlpha2: "TD", codeAlpha3: "TCD", label: "Tchad", nationalityLabel: "Tchadienne" },
  { codeAlpha2: "TG", codeAlpha3: "TGO", label: "Togo", nationalityLabel: "Togolaise" },
  { codeAlpha2: "TN", codeAlpha3: "TUN", label: "Tunisie", nationalityLabel: "Tunisienne" },
  { codeAlpha2: "TR", codeAlpha3: "TUR", label: "Turquie", nationalityLabel: "Turque" },
  { codeAlpha2: "UA", codeAlpha3: "UKR", label: "Ukraine", nationalityLabel: "Ukrainienne" },
] as const satisfies readonly CountryDefinition[];

export const countryOptions: readonly CountryReference[] = countryDefinitions.map(
  ({ codeAlpha2, codeAlpha3, label }) => ({ codeAlpha2, codeAlpha3, label }),
);

export const nationalityOptions: readonly NationalityReference[] =
  countryDefinitions.map(
    ({ codeAlpha2, codeAlpha3, nationalityLabel }) => ({
      countryCodeAlpha2: codeAlpha2,
      countryCodeAlpha3: codeAlpha3,
      label: nationalityLabel,
    }),
  );

export const franceCountryReference: CountryReference = {
  codeAlpha2: "FR",
  codeAlpha3: "FRA",
  label: "France",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]/g, "");
}

export function resolveCountryReference(value: unknown): CountryReference | null {
  if (typeof value === "string") {
    const normalized = normalize(value);
    const match = countryDefinitions.find(
      (country) =>
        normalize(country.label) === normalized ||
        country.codeAlpha2.toLowerCase() === value.trim().toLowerCase() ||
        country.codeAlpha3.toLowerCase() === value.trim().toLowerCase(),
    );
    return match
      ? {
          codeAlpha2: match.codeAlpha2,
          codeAlpha3: match.codeAlpha3,
          label: match.label,
        }
      : null;
  }

  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CountryReference>;
  const match = countryDefinitions.find(
    (country) =>
      country.codeAlpha2 === candidate.codeAlpha2 &&
      country.codeAlpha3 === candidate.codeAlpha3 &&
      country.label === candidate.label,
  );
  return match
    ? {
        codeAlpha2: match.codeAlpha2,
        codeAlpha3: match.codeAlpha3,
        label: match.label,
      }
    : null;
}

export function resolveNationalityReference(
  value: unknown,
): NationalityReference | null {
  if (typeof value === "string") {
    const normalized = normalize(value);
    const match = countryDefinitions.find(
      (country) =>
        normalize(country.nationalityLabel) === normalized ||
        normalize(country.label) === normalized,
    );
    return match
      ? {
          countryCodeAlpha2: match.codeAlpha2,
          countryCodeAlpha3: match.codeAlpha3,
          label: match.nationalityLabel,
        }
      : null;
  }

  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<NationalityReference>;
  const match = countryDefinitions.find(
    (country) =>
      country.codeAlpha2 === candidate.countryCodeAlpha2 &&
      country.codeAlpha3 === candidate.countryCodeAlpha3 &&
      country.nationalityLabel === candidate.label,
  );
  return match
    ? {
        countryCodeAlpha2: match.codeAlpha2,
        countryCodeAlpha3: match.codeAlpha3,
        label: match.nationalityLabel,
      }
    : null;
}
