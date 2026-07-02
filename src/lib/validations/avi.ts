import { z } from "zod";

export const manualAviTemplateVersion = "avi-financial@2026-01";

const maxTextLength = 1_000;
const htmlLikePattern = /[<>]/;

function cleanText(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
}

function optionalText(max = maxTextLength) {
  return z
    .preprocess((value) => {
      if (typeof value !== "string") return undefined;
      const cleaned = cleanText(value);
      return cleaned || undefined;
    }, z.string().max(max).optional())
    .refine((value) => !value || !htmlLikePattern.test(value), {
      message: "HTML brut non autorise.",
    });
}

function requiredText(max = maxTextLength) {
  return z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(1).max(max))
    .refine((value) => !htmlLikePattern.test(value), {
      message: "HTML brut non autorise.",
    });
}

function amountNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const normalized = value.replace(/\s/g, "").replace(",", ".");
  return Number(normalized);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const safeDate = optionalText(32).refine(
  (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
  { message: "Date attendue au format YYYY-MM-DD." },
);

export const manualAviPayloadSchema = z
  .object({
    studentFullName: requiredText(160),
    studentDateOfBirth: safeDate,
    studentPlaceOfBirth: optionalText(120),
    studentEmail: optionalText(254).refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      { message: "Email invalide." },
    ),
    destinationCountry: optionalText(80).default("France"),
    originCountry: optionalText(80),
    aviAmount: z.preprocess(
      amountNumber,
      z.number().finite().positive().max(1_000_000_000),
    ),
    currency: optionalText(3)
      .transform((value) => (value ?? "EUR").toUpperCase())
      .refine((value) => /^[A-Z]{3}$/.test(value), {
        message: "Devise ISO 4217 attendue.",
      }),
    academicYear: requiredText(32).refine(
      (value) => /^\d{4}-\d{4}$/.test(value),
      { message: "Annee academique attendue au format 2026-2027." },
    ),
    schoolName: optionalText(160),
    issueDate: safeDate.default(todayIsoDate),
    validUntil: safeDate,
    aviReference: optionalText(80).refine(
      (value) => !value || /^[A-Za-z0-9_-]{6,80}$/.test(value),
      { message: "Reference AVI invalide." },
    ),
    internalCaseReference: optionalText(120),
    notesForAdmin: optionalText(500),
  })
  .strict();

export type ManualAviPayloadInput = z.input<typeof manualAviPayloadSchema>;
export type ManualAviPayload = z.output<typeof manualAviPayloadSchema> & {
  aviReference: string;
  templateVersion: typeof manualAviTemplateVersion;
};

function yearFromIssueDate(issueDate: string) {
  return issueDate.slice(0, 4);
}

export function buildManualAviReference(
  issueDate = todayIsoDate(),
  randomId = crypto.randomUUID().replace(/-/g, "").slice(0, 8),
) {
  return `AVI-${yearFromIssueDate(issueDate)}-MANUAL-${randomId.toUpperCase()}`;
}

export function parseManualAviPayload(input: unknown): ManualAviPayload {
  const parsed = manualAviPayloadSchema.parse(input);

  return {
    ...parsed,
    aviReference:
      parsed.aviReference ?? buildManualAviReference(parsed.issueDate),
    templateVersion: manualAviTemplateVersion,
  };
}

