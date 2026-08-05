import "server-only";

import rawInventory from "./housing-inventory.bootstrap.json";

export type HousingBootstrapResidence = {
  id: string;
  internalReference: string;
  countryCode: "FR";
  countryName: "France";
  cityCode: string;
  cityLabel: string;
  zoneLabel: string;
  municipality: string;
  postalCode: string;
  partner: {
    commercialName: string;
    operatorName: string;
  };
  residenceName: string;
  residenceDisplayName: string;
  address: {
    line1: string;
    postalCode: string;
    city: string;
    country: "France";
    formattedAddress: string;
  };
  publicAddress: {
    formattedAddress: string;
    displayToClient: boolean;
    validatedAt: string | null;
    validatedByAdminUid: string | null;
  };
  accommodationTypes: string[];
  pricing: {
    currency: "EUR";
    cityStartingPrice: number | null;
    residenceDisplayedRent: number | null;
    monthlyRentForCertificate: number | null;
    priceGapWithCityStartingPrice: number | null;
    priceValidationStatus: "requires_admin_review";
  };
  availability: {
    status: "confirmation_required";
    operationalLabel: string;
    guaranteed: false;
    guaranteeLabel: string;
    lastCheckedAt: string;
  };
  isVisibleToClients: boolean;
  isSelectableForConditionalRequest: boolean;
  isEligibleForCertificate: boolean;
  manualReviewRequired: true;
  autoIssuance: {
    enabled: false;
    eligibilityStatus: "manual_review_only";
    validUntil: null;
    conditionalCapacity: null;
    remainingConditionalCapacity: null;
    manualReviewRequired: true;
  };
  source: {
    officialUrl: string;
    workbookName: string;
    sheetName: string;
    lastCheckedAt: string;
  };
  observations: string | null;
};

export type HousingBootstrapCity = {
  code: string;
  label: string;
  residenceCount: number;
  minimumDisplayedRent: number | null;
  maximumDisplayedRent: number | null;
  currency: "EUR";
  cityStartingPrice: number | null;
  availabilityLabel: string;
  residenceIds: string[];
  residences: HousingBootstrapResidence[];
};

type HousingBootstrapInventory = {
  schemaVersion: string;
  generatedAt: string;
  sourceWorkbook: string;
  sourceSheet: string;
  summary: {
    residenceCount: number;
    cityZoneCount: number;
    municipalityCount: number;
    allAutoIssuanceDisabled: boolean;
    allManualReviewRequired: boolean;
  };
  cities: HousingBootstrapCity[];
};

export const HOUSING_INVENTORY =
  rawInventory as unknown as HousingBootstrapInventory;

export function getBootstrapHousingCities(): HousingBootstrapCity[] {
  return [...HOUSING_INVENTORY.cities].sort((a, b) =>
    a.label.localeCompare(b.label, "fr"),
  );
}

export function getBootstrapHousingResidencesByCity(
  cityCode: string,
): HousingBootstrapResidence[] {
  const city = HOUSING_INVENTORY.cities.find((item) => item.code === cityCode);
  return city ? [...city.residences] : [];
}

export function getBootstrapHousingResidenceById(
  housingInventoryId: string,
): HousingBootstrapResidence | null {
  for (const city of HOUSING_INVENTORY.cities) {
    const residence = city.residences.find(
      (item) => item.id === housingInventoryId,
    );
    if (residence) return residence;
  }
  return null;
}

export function canAutoIssueFromBootstrap(): false {
  // Security invariant: bootstrap data never authorizes automatic issuance.
  return false;
}
