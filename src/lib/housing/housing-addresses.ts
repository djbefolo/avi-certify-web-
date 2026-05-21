export type HousingAddress = {
  city: string;
  address: string;
  rent: number;
  available: boolean;
};

export const housingAddresses: HousingAddress[] = [
  {
    city: "Paris",
    address: "12 Rue de la Chapelle, 75018 Paris",
    rent: 790,
    available: true,
  },
  {
    city: "Lyon",
    address: "24 Rue Garibaldi, 69003 Lyon",
    rent: 620,
    available: true,
  },
  {
    city: "Marseille",
    address: "18 Boulevard National, 13001 Marseille",
    rent: 560,
    available: true,
  },
  {
    city: "Lille",
    address: "9 Rue de Douai, 59000 Lille",
    rent: 540,
    available: true,
  },
  {
    city: "Toulouse",
    address: "31 Rue de la Colombette, 31000 Toulouse",
    rent: 570,
    available: true,
  },
  {
    city: "Bordeaux",
    address: "16 Cours de la Marne, 33800 Bordeaux",
    rent: 590,
    available: true,
  },
  {
    city: "Montpellier",
    address: "22 Avenue de Toulouse, 34070 Montpellier",
    rent: 520,
    available: true,
  },
  {
    city: "Strasbourg",
    address: "14 Route du Polygone, 67100 Strasbourg",
    rent: 550,
    available: true,
  },
  {
    city: "Nantes",
    address: "7 Rue de la Convention, 44100 Nantes",
    rent: 530,
    available: true,
  },
  {
    city: "Besançon",
    address: "75 Rue de Besançon, 25300 Pontarlier",
    rent: 490,
    available: true,
  },
];

export function selectHousingAddress(seed: string): HousingAddress {
  const availableAddresses = housingAddresses.filter((housing) => housing.available);

  if (availableAddresses.length === 0) {
    throw new Error("No housing address is currently available.");
  }

  const hash = [...seed].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  return availableAddresses[hash % availableAddresses.length];
}
