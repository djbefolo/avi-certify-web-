export const HOUSING_PARTNER_DISCOUNT_BASIS_POINTS = 1_000;

const BASIS_POINTS_SCALE = 10_000;
const CENTS_PER_EURO = 100;
const MONEY_TOLERANCE = 1e-7;

type HousingPricingInput = {
  cityIndicativePrice?: unknown;
  residenceDisplayedRent?: unknown;
  monthlyRentForCertificate?: unknown;
  partnerMonthlyRent?: unknown;
  discountBasisPoints?: unknown;
  clientMonthlyRent?: unknown;
};

function assertMoneyAmount(value: unknown, errorCode: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(errorCode);
  }
  const cents = Math.round(value * CENTS_PER_EURO);
  if (Math.abs(value * CENTS_PER_EURO - cents) > MONEY_TOLERANCE) {
    throw new Error(errorCode);
  }
  return cents;
}

export function housingEurosToCents(value: number) {
  return assertMoneyAmount(value, "HOUSING_PRICING_AMOUNT_INVALID");
}

export function housingCentsToEuros(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("HOUSING_PRICING_CENTS_INVALID");
  }
  return value / CENTS_PER_EURO;
}

export function resolveHousingClientRent(
  partnerMonthlyRent: number,
  discountBasisPoints = HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
) {
  const partnerRentCents = assertMoneyAmount(
    partnerMonthlyRent,
    "HOUSING_PARTNER_RENT_INVALID",
  );
  if (
    !Number.isInteger(discountBasisPoints) ||
    discountBasisPoints < 0 ||
    discountBasisPoints >= BASIS_POINTS_SCALE
  ) {
    throw new Error("HOUSING_DISCOUNT_BASIS_POINTS_INVALID");
  }

  const numerator = partnerRentCents * (BASIS_POINTS_SCALE - discountBasisPoints);
  if (!Number.isSafeInteger(numerator)) {
    throw new Error("HOUSING_PRICING_CALCULATION_UNSAFE");
  }

  // Positive monetary values are rounded half-up to the nearest centime.
  return housingCentsToEuros(
    Math.floor((numerator + BASIS_POINTS_SCALE / 2) / BASIS_POINTS_SCALE),
  );
}

export function buildHousingClientPricing(partnerMonthlyRent: number) {
  const normalizedPartnerRent = housingCentsToEuros(
    assertMoneyAmount(partnerMonthlyRent, "HOUSING_PARTNER_RENT_INVALID"),
  );
  const clientMonthlyRent = resolveHousingClientRent(normalizedPartnerRent);

  return {
    partnerMonthlyRent: normalizedPartnerRent,
    discountBasisPoints: HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
    clientMonthlyRent,
    monthlyRentForCertificate: clientMonthlyRent,
  } as const;
}

function readOptionalMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? housingCentsToEuros(assertMoneyAmount(value, "HOUSING_PRICING_AMOUNT_INVALID"))
    : null;
}

export function resolveHousingPartnerRent(pricing: HousingPricingInput) {
  return (
    readOptionalMoney(pricing.partnerMonthlyRent) ??
    readOptionalMoney(pricing.monthlyRentForCertificate) ??
    readOptionalMoney(pricing.residenceDisplayedRent) ??
    readOptionalMoney(pricing.cityIndicativePrice)
  );
}

// Snapshot values are already frozen client prices. Never apply the current
// discount here: historical certificates must keep their original rent.
export function resolveHousingSnapshotRent(pricing: HousingPricingInput) {
  return (
    readOptionalMoney(pricing.clientMonthlyRent) ??
    readOptionalMoney(pricing.monthlyRentForCertificate) ??
    readOptionalMoney(pricing.residenceDisplayedRent) ??
    readOptionalMoney(pricing.cityIndicativePrice)
  );
}

export function sameHousingMoneyAmount(left: number, right: number) {
  return housingEurosToCents(left) === housingEurosToCents(right);
}
