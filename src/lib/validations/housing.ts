import { z } from "zod";

const cleanText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} est requis.`)
    .max(max, `${label} est trop long.`)
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), {
      message: `${label} ne doit pas contenir de HTML.`,
    });

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} est trop long.`)
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), {
      message: `${label} ne doit pas contenir de HTML.`,
    })
    .optional()
    .default("");

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;

  const [year, month, day] = value.split("-").map(Number);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function isFutureOrToday(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date.getTime() >= today.getTime();
}

export const housingRequestInputSchema = z
  .object({
    studentFirstName: cleanText("Le prenom", 80),
    studentLastName: cleanText("Le nom", 100),
    studentPhone: cleanText("Le telephone", 40),
    studentDateOfBirth: z
      .string()
      .refine(validDate, "La date de naissance est invalide.")
      .refine(
        (value) => new Date(`${value}T00:00:00.000Z`).getTime() < Date.now(),
        "La date de naissance doit etre anterieure a aujourd'hui.",
      ),
    studentPlaceOfBirth: cleanText("Le lieu de naissance", 120),
    nationality: cleanText("La nationalite", 80),
    originCountry: cleanText("Le pays d'origine", 80),
    currentResidenceCountry: cleanText("Le pays de residence", 80),
    destinationCountry: z.literal("France"),
    preferredCityCode: z.string().trim().min(1).max(100),
    housingInventoryId: z.string().trim().min(1).max(160),
    schoolName: cleanText("L'etablissement", 180),
    schoolCity: cleanText("La ville de l'etablissement", 100),
    academicYear: cleanText("L'annee academique", 30),
    expectedArrivalDate: z
      .string()
      .refine(validDate, "La date d'arrivee est invalide.")
      .refine(isFutureOrToday, "La date d'arrivee doit etre aujourd'hui ou ulterieure."),
    expectedStayDurationMonths: z.coerce.number().int().min(1).max(24),
    accommodationType: z.enum(["studio", "t1_bis", "t2", "shared", "other"]),
    specialNeeds: optionalText("Les besoins particuliers", 500),
    notes: optionalText("Les notes", 1000),
    consentAccuracy: z.literal(true),
    consentConditionalNature: z.literal(true),
    consentTerms: z.literal(true),
    consentDataProcessing: z.literal(true),
    consentAddressAdjustment: z.literal(true),
  })
  .strict();

export const housingAllocationInputSchema = z
  .object({
    inventoryReference: cleanText("La reference inventaire", 80),
    partnerName: cleanText("Le partenaire", 120),
    residenceName: cleanText("La residence", 160),
    addressLine: cleanText("L'adresse", 220),
    postalCode: z.string().trim().regex(/^\d{5}$/, "Le code postal est invalide."),
    city: cleanText("La ville", 100),
    accommodationType: z.enum(["studio", "t1_bis", "t2", "shared", "other"]),
    monthlyRent: z.coerce.number().positive().max(10_000),
    currency: z.literal("EUR"),
    confirmedAt: z.string().refine(validDate, "La date de confirmation est invalide."),
    confirmationReference: cleanText("La preuve de confirmation", 160),
    validUntil: z.string().refine(validDate, "La date de validite est invalide."),
    allocationReason: cleanText("Le motif d'attribution", 500),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Date(value.confirmedAt).getTime() > Date.now()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmedAt"],
        message: "La confirmation partenaire ne peut pas etre future.",
      });
    }
    if (new Date(value.validUntil) <= new Date(value.confirmedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "La validite doit etre posterieure a la confirmation partenaire.",
      });
    }
  });

const optionalIsoDateTime = z
  .union([z.string().datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : undefined));

export const housingInventoryGovernanceInputSchema = z
  .object({
    inventoryStatus: z
      .enum([
        "draft",
        "available",
        "conditionally_available",
        "confirmation_required",
        "unavailable",
        "suspended",
        "archived",
      ])
      .optional(),
    isVisibleToClients: z.boolean().optional(),
    publicAddressFormattedAddress: z.string().trim().min(5).max(500).optional(),
    publicAddressDisplayToClient: z.boolean().optional(),
    isEligibleForCertificate: z.boolean().optional(),
    priceValidationStatus: z
      .enum(["unverified", "verified", "requires_admin_review"])
      .optional(),
    monthlyRentForCertificate: z.number().positive().max(10_000).optional(),
    autoIssuanceEnabled: z.boolean().optional(),
    eligibilityStatus: z
      .enum(["eligible", "manual_review_only", "suspended", "expired"])
      .optional(),
    validUntil: optionalIsoDateTime,
    conditionalCapacity: z.number().int().positive().max(100_000).optional(),
    remainingConditionalCapacity: z.number().int().min(0).max(100_000).optional(),
    arrivalDateFrom: optionalIsoDateTime,
    arrivalDateUntil: optionalIsoDateTime,
    manualReviewRequired: z.boolean().optional(),
    stopReason: z.string().trim().max(500).optional(),
    confirmationReference: z.string().trim().max(160).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.conditionalCapacity !== undefined &&
      value.remainingConditionalCapacity !== undefined &&
      value.remainingConditionalCapacity > value.conditionalCapacity
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remainingConditionalCapacity"],
        message: "La capacite restante ne peut pas depasser le quota.",
      });
    }
    if (
      value.arrivalDateFrom &&
      value.arrivalDateUntil &&
      Date.parse(value.arrivalDateUntil) < Date.parse(value.arrivalDateFrom)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["arrivalDateUntil"],
        message: "La fin de la fenetre d'arrivee doit suivre son debut.",
      });
    }
  });

export type HousingRequestInput = z.output<typeof housingRequestInputSchema>;
export type HousingAllocationInput = z.output<typeof housingAllocationInputSchema>;
export type HousingInventoryGovernanceInput = z.output<
  typeof housingInventoryGovernanceInputSchema
>;
