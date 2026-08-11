import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { normalizeLeadEmail } from "@/lib/leads/normalize-lead";
import {
  leadFormSchema,
  type LeadFormValues,
} from "@/lib/validations/lead";

const LEADS_COLLECTION = "leads";

export type LeadSource = "landing_page";

export type LeadRequestContext = {
  ipAddress?: string;
  userAgent?: string | null;
};

export type CreateLeadInput = LeadFormValues & {
  source: LeadSource;
  receivedAt: number;
  requestContext?: LeadRequestContext;
};

export type CreatedLead = {
  id: string;
};

type FirestoreServerTimestamp = ReturnType<typeof FieldValue.serverTimestamp>;

export type FirestoreLeadDocument = {
  fullName: string;
  phone: string;
  email: string;
  normalizedEmail: string;
  residenceCountry: LeadFormValues["residenceCountry"];
  destinationCountry: LeadFormValues["destinationCountry"];
  requestedService: LeadFormValues["requestedService"];
  message: string | null;
  source: LeadSource;
  sourceDetail: LeadSource;
  status: "new";
  crmStatus: "NEW";
  consentAccepted: true;
  contactConsent: true;
  marketingConsent: false;
  receivedAt: number;
  createdAt: FirestoreServerTimestamp;
  updatedAt: FirestoreServerTimestamp;
  consentAcceptedAt: FirestoreServerTimestamp;
  metadata: {
    ipAddress: string | null;
    userAgent: string | null;
  };
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeOptionalText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const sanitized = value.replace(/\u0000/g, "").trim();

  return sanitized ? sanitized : undefined;
}

export function validateLead(data: unknown): LeadFormValues {
  const parsed = leadFormSchema.parse(data);

  return {
    ...parsed,
    fullName: normalizeWhitespace(parsed.fullName),
    phone: normalizeWhitespace(parsed.phone),
    email: parsed.email.trim().toLowerCase(),
    message: sanitizeOptionalText(parsed.message),
  };
}

export function mapLeadToFirestore(
  data: CreateLeadInput,
): FirestoreLeadDocument {
  const normalizedEmail = normalizeLeadEmail(data.email);

  if (!normalizedEmail) {
    throw new Error("Validated lead email is required.");
  }

  return {
    fullName: data.fullName,
    phone: data.phone,
    email: data.email,
    normalizedEmail,
    residenceCountry: data.residenceCountry,
    destinationCountry: data.destinationCountry,
    requestedService: data.requestedService,
    message: data.message ?? null,
    source: data.source,
    sourceDetail: data.source,
    status: "new",
    crmStatus: "NEW",
    consentAccepted: true,
    contactConsent: true,
    marketingConsent: false,
    receivedAt: data.receivedAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    consentAcceptedAt: FieldValue.serverTimestamp(),
    metadata: {
      ipAddress: data.requestContext?.ipAddress ?? null,
      userAgent: data.requestContext?.userAgent ?? null,
    },
  };
}

export async function createLead(data: CreateLeadInput): Promise<CreatedLead> {
  const db = getAdminFirestore();
  const leadDocument = mapLeadToFirestore(data);
  const leadRef = await db.collection(LEADS_COLLECTION).add(leadDocument);

  return {
    id: leadRef.id,
  };
}
