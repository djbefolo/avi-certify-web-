export type HousingRegionCode =
  | "ile_de_france"
  | "auvergne_rhone_alpes"
  | "grand_est"
  | "occitanie"
  | "nouvelle_aquitaine"
  | "paca"
  | "hauts_de_france"
  | "pays_de_la_loire"
  | "bourgogne_franche_comte";

export type HousingRegion = {
  code: HousingRegionCode;
  label: string;
};

export type HousingInventoryAddress = {
  region: HousingRegionCode;
  city: string;
  fullAddress: string;
  rent: number;
  available: boolean;
};

export const housingRegions: HousingRegion[] = [
  { code: "ile_de_france", label: "Île-de-France" },
  { code: "auvergne_rhone_alpes", label: "Auvergne-Rhône-Alpes" },
  { code: "grand_est", label: "Grand Est" },
  { code: "occitanie", label: "Occitanie" },
  { code: "nouvelle_aquitaine", label: "Nouvelle-Aquitaine" },
  { code: "paca", label: "PACA" },
  { code: "hauts_de_france", label: "Hauts-de-France" },
  { code: "pays_de_la_loire", label: "Pays de la Loire" },
  { code: "bourgogne_franche_comte", label: "Bourgogne-Franche-Comté" },
];

export const housingRegionCodes = housingRegions.map((region) => region.code) as [
  HousingRegionCode,
  ...HousingRegionCode[],
];

export const housingInventory: HousingInventoryAddress[] = [
  {
    region: "ile_de_france",
    city: "Paris",
    fullAddress: "12 Rue de la Chapelle, 75018 Paris",
    rent: 790,
    available: true,
  },
  {
    region: "auvergne_rhone_alpes",
    city: "Lyon",
    fullAddress: "24 Rue Garibaldi, 69003 Lyon",
    rent: 620,
    available: true,
  },
  {
    region: "grand_est",
    city: "Strasbourg",
    fullAddress: "14 Route du Polygone, 67100 Strasbourg",
    rent: 550,
    available: true,
  },
  {
    region: "occitanie",
    city: "Toulouse",
    fullAddress: "31 Rue de la Colombette, 31000 Toulouse",
    rent: 570,
    available: true,
  },
  {
    region: "nouvelle_aquitaine",
    city: "Bordeaux",
    fullAddress: "16 Cours de la Marne, 33800 Bordeaux",
    rent: 590,
    available: true,
  },
  {
    region: "paca",
    city: "Marseille",
    fullAddress: "18 Boulevard National, 13001 Marseille",
    rent: 560,
    available: true,
  },
  {
    region: "hauts_de_france",
    city: "Lille",
    fullAddress: "9 Rue de Douai, 59000 Lille",
    rent: 540,
    available: true,
  },
  {
    region: "pays_de_la_loire",
    city: "Nantes",
    fullAddress: "7 Rue de la Convention, 44100 Nantes",
    rent: 530,
    available: true,
  },
  {
    region: "bourgogne_franche_comte",
    city: "Besançon",
    fullAddress: "75 Rue de Besançon, 25300 Pontarlier",
    rent: 490,
    available: true,
  },
];

export function isHousingRegionCode(
  value: string | null | undefined,
): value is HousingRegionCode {
  return housingRegionCodes.includes(value as HousingRegionCode);
}

export function selectHousingAddress({
  region,
  seed,
}: {
  region?: string | null;
  seed: string;
}): HousingInventoryAddress {
  const selectedRegion = isHousingRegionCode(region) ? region : null;
  const availableAddresses = housingInventory.filter(
    (housing) =>
      housing.available &&
      (!selectedRegion || housing.region === selectedRegion),
  );
  const fallbackAddresses = housingInventory.filter((housing) => housing.available);
  const candidates = availableAddresses.length > 0 ? availableAddresses : fallbackAddresses;

  if (candidates.length === 0) {
    throw new Error("No housing address is currently available.");
  }

  const hash = [...seed].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  return candidates[hash % candidates.length];
}
