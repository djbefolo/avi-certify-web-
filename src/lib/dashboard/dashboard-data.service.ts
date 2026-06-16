import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  getProfileCompletion,
  mapStudentProfile,
} from "@/lib/profile/student-profile";
import type {
  ApplicationDocument,
  ApplicationPayment,
  PaymentStatus as DashboardPaymentStatus,
} from "@/types/application";
import type {
  DocumentStatus as FirestoreDocumentStatus,
  DocumentType,
  UserDocument,
} from "@/types/document";
import type { DashboardCertificateSummary } from "@/types/dashboard";
import type { PaymentRecord, PaymentStatus } from "@/types/payment";
import type { StudentProfile } from "@/types/student-profile";

type RequiredDocumentDefinition = {
  id: string;
  title: string;
  description: string;
  firestoreTypes: DocumentType[];
};

export type UserProfileSummary = StudentProfile & {
  completionPercent: number;
  completionState: "incomplete" | "partial" | "complete";
  completionSections: Array<{
    label: string;
    percent: number;
  }>;
};

export const REQUIRED_DOCUMENTS: RequiredDocumentDefinition[] = [
  {
    id: "passport",
    title: "Passeport",
    description:
      "Copie lisible du passeport. Statut determine par les fichiers recus.",
    firestoreTypes: ["passport"],
  },
  {
    id: "admission_letter",
    title: "Admission ou pre-inscription",
    description: "Document emis par l'etablissement vise, si deja disponible.",
    firestoreTypes: ["admission_letter"],
  },
  {
    id: "financial_proof",
    title: "Justificatifs financiers",
    description: "Elements reels fournis pour l'analyse du financement.",
    firestoreTypes: [
      "proof_of_funds",
      "bank_statement",
      "bank_document",
      "payment_proof",
    ],
  },
];

export const emptyCertificateSummary: DashboardCertificateSummary = {
  available: false,
  title: "Attestation",
  description:
    "Aucune attestation n'est disponible dans votre espace client pour le moment.",
  certificateNumber: null,
  verificationUrl: null,
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
}

function getDocumentTime(document: UserDocument) {
  return document.updatedAt?.getTime() ?? document.createdAt?.getTime() ?? 0;
}

function mapDocumentSnapshot(id: string, data: DocumentData): UserDocument {
  return {
    id,
    ownerId: String(data.ownerId),
    documentType: data.documentType as DocumentType,
    status: data.status as FirestoreDocumentStatus,
    originalFileName: String(data.originalFileName ?? ""),
    safeFileName: String(data.safeFileName ?? ""),
    contentType: data.contentType as UserDocument["contentType"],
    size: Number(data.size ?? 0),
    storagePath: String(data.storagePath ?? ""),
    certificateId:
      typeof data.certificateId === "string" ? data.certificateId : null,
    certificateNumber:
      typeof data.certificateNumber === "string" ? data.certificateNumber : null,
    verificationUrl:
      typeof data.verificationUrl === "string" ? data.verificationUrl : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapDocumentStatus(
  status: FirestoreDocumentStatus | string | undefined,
): ApplicationDocument["status"] {
  if (status === "approved" || status === "validated") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "uploaded" || status === "under_review") {
    return "pending_review";
  }

  return "missing";
}

function mapDocumentWorkflowStatus(
  status: FirestoreDocumentStatus | string | undefined,
): NonNullable<ApplicationDocument["workflowStatus"]> {
  if (status === "approved" || status === "validated") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "under_review") {
    return "under_review";
  }

  if (status === "uploaded") {
    return "uploaded";
  }

  return "missing";
}

function getSafeVerificationUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value, "https://www.avicertify.fr");

    return url.pathname.startsWith("/verifier/") ? value : null;
  } catch {
    return value.startsWith("/verifier/") ? value : null;
  }
}

function mapPaymentStatus(
  status: PaymentStatus | "created" | "open" | string | undefined,
): DashboardPaymentStatus {
  if (status === "paid") {
    return "paid";
  }

  if (status === "failed") {
    return "failed";
  }

  if (status === "refunded") {
    return "refunded";
  }

  if (status === "pending" || status === "created" || status === "open") {
    return "pending";
  }

  return "not_started";
}

function getPaymentTime(payment: PaymentRecord) {
  return payment.updatedAt?.getTime() ?? payment.createdAt?.getTime() ?? 0;
}

function mapPaymentSnapshot(id: string, data: DocumentData): PaymentRecord {
  return {
    id,
    ownerId: String(data.ownerId),
    serviceType: data.serviceType,
    serviceLabel: String(data.serviceLabel ?? "Paiement AVI CERTIFY"),
    amount: Number(data.amount ?? data.amountTotal ?? 0),
    currency: data.currency ?? "eur",
    status: data.status as PaymentStatus,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
    stripePaymentIntentId: data.stripePaymentIntentId ?? null,
    stripeSessionId: data.stripeSessionId ?? null,
    paymentIntentId: data.paymentIntentId ?? null,
    stripeChargeId: data.stripeChargeId ?? null,
    checkoutUrl: data.checkoutUrl ?? null,
    amountTotal: data.amountTotal ?? null,
    amountRefunded: data.amountRefunded ?? null,
    customerEmail: data.customerEmail ?? null,
    productFamily: data.productFamily ?? null,
    paidAt: toDate(data.paidAt),
    failedAt: toDate(data.failedAt),
    refundedAt: toDate(data.refundedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function getAmountLabel(payment: PaymentRecord | null) {
  if (!payment) {
    return "Non démarré";
  }

  const amount = payment.amountTotal ?? payment.amount;

  if (!amount || amount <= 0) {
    return payment.serviceLabel;
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: payment.currency.toUpperCase(),
  }).format(amount / 100);
}

export async function getRequiredDocumentSummary(
  uid: string,
): Promise<ApplicationDocument[]> {
  return (await getUserDocumentDashboardSummary(uid)).documents;
}

export function getRequiredDocumentSummaryFromDocuments(
  documents: UserDocument[],
): ApplicationDocument[] {
  return REQUIRED_DOCUMENTS.map((definition) => {
    const latestDocument = documents
      .filter((document) =>
        definition.firestoreTypes.includes(document.documentType),
      )
      .sort((a, b) => getDocumentTime(b) - getDocumentTime(a))[0];

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      status: mapDocumentStatus(latestDocument?.status),
      workflowStatus: mapDocumentWorkflowStatus(latestDocument?.status),
      required: true,
    };
  });
}

export function getCertificateSummaryFromDocuments(
  documents: UserDocument[],
): DashboardCertificateSummary {
  const certificate = documents
    .filter(
      (document) =>
        (document.documentType === "accommodation_certificate" ||
          Boolean(document.certificateNumber)) &&
        ["approved", "validated", "generated"].includes(document.status),
    )
    .sort((a, b) => getDocumentTime(b) - getDocumentTime(a))[0];

  if (!certificate) {
    return emptyCertificateSummary;
  }

  return {
    available: true,
    title: certificate.originalFileName || "Attestation AVI CERTIFY",
    description:
      "Une attestation generee est disponible. Seul le numero public et le lien de verification sont affiches ici.",
    certificateNumber: certificate.certificateNumber ?? null,
    verificationUrl: getSafeVerificationUrl(certificate.verificationUrl ?? null),
  };
}

export async function getUserDocumentDashboardSummary(uid: string): Promise<{
  documents: ApplicationDocument[];
  certificate: DashboardCertificateSummary;
}> {
  const db = getFirebaseDb();
  const documentsQuery = query(
    collection(db, "documents"),
    where("ownerId", "==", uid),
  );
  const snapshot = await getDocs(documentsQuery);
  const documents = snapshot.docs.map((documentSnapshot) =>
    mapDocumentSnapshot(documentSnapshot.id, documentSnapshot.data()),
  );

  return {
    documents: getRequiredDocumentSummaryFromDocuments(documents),
    certificate: getCertificateSummaryFromDocuments(documents),
  };
}

export async function getLatestPaymentSummary(
  uid: string,
): Promise<ApplicationPayment> {
  const db = getFirebaseDb();
  const paymentsQuery = query(
    collection(db, "payments"),
    where("ownerId", "==", uid),
  );
  const snapshot = await getDocs(paymentsQuery);
  const latestPayment =
    snapshot.docs
      .map((paymentSnapshot) =>
        mapPaymentSnapshot(paymentSnapshot.id, paymentSnapshot.data()),
      )
      .sort((a, b) => getPaymentTime(b) - getPaymentTime(a))[0] ?? null;
  const status = mapPaymentStatus(latestPayment?.status);

  return {
    id: latestPayment?.id,
    status,
    amountLabel: getAmountLabel(latestPayment),
    description: latestPayment
      ? latestPayment.serviceLabel
      : "Aucun paiement n'a encore ete demarre pour ce dossier.",
  };
}

export async function getUserProfileSummary(
  uid: string,
): Promise<UserProfileSummary | null> {
  const profileSnapshot = await getDoc(doc(getFirebaseDb(), "users", uid));

  if (!profileSnapshot.exists()) {
    return null;
  }

  const data = profileSnapshot.data();
  const profile = mapStudentProfile(uid, data);
  const completion = getProfileCompletion(profile);

  return {
    ...profile,
    completionPercent: completion.percent,
    completionState: completion.state,
    completionSections: completion.sections.map((section) => ({
      label: section.label,
      percent: section.percent,
    })),
  };
}
