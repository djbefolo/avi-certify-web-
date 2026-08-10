export const HOUSING_PARTNER_DISCOUNT_PRICING_VERSION = "partner-discount-v1";
export const HOUSING_PARTNER_DISCOUNT_BASIS_POINTS = 1_000;

const BASIS_POINTS_SCALE = 10_000;
const CENTS_PER_EURO = 100;
const MONEY_TOLERANCE = 1e-7;

type HousingPricingInput = {
  currency?: unknown;
  cityIndicativePrice?: unknown;
  residenceDisplayedRent?: unknown;
  monthlyRentForCertificate?: unknown;
  partnerMonthlyRent?: unknown;
  discountBasisPoints?: unknown;
  clientMonthlyRent?: unknown;
  pricingVersion?: unknown;
};

export type ResolvedHousingClientPricing = {
  mode: "partner_discount" | "legacy";
  partnerMonthlyRent: number | null;
  discountBasisPoints: number | null;
  clientMonthlyRent: number;
  pricingVersion: string | null;
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

export function calculateDiscountedHousingRentCents({
  partnerRentCents,
  discountBasisPoints,
}: {
  partnerRentCents: number;
  discountBasisPoints: number;
}) {
  if (!Number.isSafeInteger(partnerRentCents) || partnerRentCents <= 0) {
    throw new Error("HOUSING_PARTNER_RENT_INVALID");
  }
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
  return Math.floor((numerator + BASIS_POINTS_SCALE / 2) / BASIS_POINTS_SCALE);
}

export function buildPartnerDiscountHousingPricing(partnerMonthlyRent: number) {
  const partnerRentCents = assertMoneyAmount(
    partnerMonthlyRent,
    "HOUSING_PARTNER_RENT_INVALID",
  );
  const clientRentCents = calculateDiscountedHousingRentCents({
    partnerRentCents,
    discountBasisPoints: HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
  });
  const clientMonthlyRent = housingCentsToEuros(clientRentCents);

  return {
    partnerMonthlyRent: housingCentsToEuros(partnerRentCents),
    discountBasisPoints: HOUSING_PARTNER_DISCOUNT_BASIS_POINTS,
    clientMonthlyRent,
    monthlyRentForCertificate: clientMonthlyRent,
    pricingVersion: HOUSING_PARTNER_DISCOUNT_PRICING_VERSION,
  } as const;
}

function readOptionalMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? housingCentsToEuros(assertMoneyAmount(value, "HOUSING_PRICING_AMOUNT_INVALID"))
    : null;
}

export function resolveHousingClientPricing(
  pricing: HousingPricingInput,
): ResolvedHousingClientPricing | null {
  if (pricing.pricingVersion === HOUSING_PARTNER_DISCOUNT_PRICING_VERSION) {
    if (pricing.discountBasisPoints !== HOUSING_PARTNER_DISCOUNT_BASIS_POINTS) {
      throw new Error("HOUSING_PRICING_VERSION_DISCOUNT_MISMATCH");
    }
    const expected = buildPartnerDiscountHousingPricing(
      readOptionalMoney(pricing.partnerMonthlyRent) ?? Number.NaN,
    );
    const storedClientCents = assertMoneyAmount(
      pricing.clientMonthlyRent,
      "HOUSING_CLIENT_RENT_INVALID",
    );
    const certificateRentCents = assertMoneyAmount(
      pricing.monthlyRentForCertificate,
      "HOUSING_CERTIFICATE_RENT_INVALID",
    );
    const expectedCents = housingEurosToCents(expected.clientMonthlyRent);
    if (storedClientCents !== expectedCents || certificateRentCents !== expectedCents) {
      throw new Error("HOUSING_PRICING_VALUES_INCONSISTENT");
    }
    return {
      mode: "partner_discount",
      partnerMonthlyRent: expected.partnerMonthlyRent,
      discountBasisPoints: expected.discountBasisPoints,
      clientMonthlyRent: expected.clientMonthlyRent,
      pricingVersion: expected.pricingVersion,
    };
  }

  if (pricing.pricingVersion) {
    throw new Error("HOUSING_PRICING_VERSION_UNSUPPORTED");
  }

  const legacyMonthlyRent =
    readOptionalMoney(pricing.monthlyRentForCertificate) ??
    readOptionalMoney(pricing.residenceDisplayedRent) ??
    readOptionalMoney(pricing.cityIndicativePrice);
  if (legacyMonthlyRent === null) return null;

  return {
    mode: "legacy",
    partnerMonthlyRent: null,
    discountBasisPoints: null,
    clientMonthlyRent: legacyMonthlyRent,
    pricingVersion: null,
  };
}

export function sameHousingMoneyAmount(left: number, right: number) {
  return housingEurosToCents(left) === housingEurosToCents(right);
}
