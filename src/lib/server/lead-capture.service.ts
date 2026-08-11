import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeLeadEmail } from "@/lib/leads/normalize-lead";

const LEADS_COLLECTION = "leads";

export const leadSourceValues = [
  "guide",
  "pricing",
  "contact",
  "signup",
  "profile",
  "unknown",
] as const;

export type LeadSource = (typeof leadSourceValues)[number];

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "CONVERTED"
  | "ARCHIVED";

export type LeadCaptureInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  destinationCountry?: string | null;
  serviceInterest?: string | null;
  projectHorizon?: string | null;
  source: LeadSource;
  origin?: string | null;
  marketingConsent: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
};

type FirestoreServerTimestamp = ReturnType<typeof FieldValue.serverTimestamp>;

export type CapturedLead = {
  id: string;
  fullName: string;
  email: string;
  normalizedEmail: string;
  phone: string | null;
  country: string | null;
  residenceCountry: string | null;
  destinationCountry: string | null;
  serviceInterest: string | null;
  requestedService: string | null;
  projectHorizon: string | null;
  source: LeadSource;
  origin: string | null;
  sourceDetail: string | null;
  status: LeadStatus;
  crmStatus: "NEW";
  marketingConsent: boolean;
  contactConsent: false;
  marketingConsentAt: FirestoreServerTimestamp | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  guideRequested: boolean;
  guideDelivered: boolean;
  createdAt: FirestoreServerTimestamp;
  updatedAt: FirestoreServerTimestamp;
};

export class LeadCaptureError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanOptionalText(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return value;

  const cleaned = normalizeWhitespace(value.replace(/\u0000/g, ""));

  return cleaned || null;
}

const optionalText = (max: number) =>
  z.preprocess(cleanOptionalText, z.string().max(max).nullable());

const leadCaptureSchema = z
  .object({
    fullName: z
      .string()
      .transform(normalizeWhitespace)
      .refine((value) => value.length >= 2, {
        message: "Le nom complet est requis.",
      })
      .refine((value) => value.length <= 100, {
        message: "Le nom complet est trop long.",
      }),
    email: z
      .string()
      .trim()
      .email("L'adresse email est invalide.")
      .max(160, "L'adresse email est trop longue.")
      .transform((value) => value.toLowerCase()),
    phone: optionalText(32),
    country: optionalText(80),
    destinationCountry: optionalText(80),
    serviceInterest: optionalText(80),
    projectHorizon: optionalText(80),
    source: z.enum(leadSourceValues, {
      errorMap: () => ({ message: "La source du lead est invalide." }),
    }),
    origin: optionalText(80),
    marketingConsent: z.boolean(),
    utmSource: optionalText(100),
    utmMedium: optionalText(100),
    utmCampaign: optionalText(120),
    utmContent: optionalText(120),
    utmTerm: optionalText(120),
    referrer: optionalText(300),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.source === "guide" && value.marketingConsent !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["marketingConsent"],
        message:
          "Le consentement marketing est requis pour demander le guide.",
      });
    }
  });

export function validateLeadCaptureInput(data: unknown): LeadCaptureInput {
  const result = leadCaptureSchema.safeParse(data);

  if (!result.success) {
    throw new LeadCaptureError(
      "Les informations du lead sont invalides.",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function mapLeadCaptureToFirestore(
  id: string,
  input: LeadCaptureInput,
): CapturedLead {
  const marketingConsentAt = input.marketingConsent
    ? FieldValue.serverTimestamp()
    : null;

  return {
    id,
    fullName: input.fullName,
    email: input.email,
    normalizedEmail: normalizeLeadEmail(input.email) ?? input.email,
    phone: input.phone ?? null,
    country: input.country ?? null,
    residenceCountry: input.country ?? null,
    destinationCountry: input.destinationCountry ?? null,
    serviceInterest: input.serviceInterest ?? null,
    requestedService: input.serviceInterest ?? null,
    projectHorizon: input.projectHorizon ?? null,
    source: input.source,
    origin: input.origin ?? null,
    sourceDetail: input.origin ?? input.source,
    status: "NEW",
    crmStatus: "NEW",
    marketingConsent: input.marketingConsent,
    contactConsent: false,
    marketingConsentAt,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmContent: input.utmContent ?? null,
    utmTerm: input.utmTerm ?? null,
    referrer: input.referrer ?? null,
    guideRequested: input.source === "guide",
    guideDelivered: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function captureLead(
  data: unknown,
): Promise<{ id: string; status: LeadStatus }> {
  const input = validateLeadCaptureInput(data);
  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS_COLLECTION).doc();
  const lead = mapLeadCaptureToFirestore(leadRef.id, input);

  await leadRef.set(lead, { merge: false });

  return {
    id: lead.id,
    status: lead.status,
  };
}
