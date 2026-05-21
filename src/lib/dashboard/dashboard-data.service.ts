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
import type { PaymentRecord, PaymentStatus } from "@/types/payment";

type RequiredDocumentDefinition = {
  id: string;
  title: string;
  description: string;
  firestoreTypes: DocumentType[];
};

export type UserProfileSummary = {
  fullName: string | null;
  email: string | null;
  uid: string;
  role: string | null;
  createdAt: Date | null;
};

export const REQUIRED_DOCUMENTS: RequiredDocumentDefinition[] = [
  {
    id: "passport",
    title: "Passeport",
    description: "Page d'identite lisible, en cours de validite.",
    firestoreTypes: ["passport"],
  },
  {
    id: "admission_letter",
    title: "Admission ou pre-inscription",
    description: "Document emis par l'etablissement vise.",
    firestoreTypes: ["admission_letter"],
  },
  {
    id: "financial_proof",
    title: "Justificatifs financiers",
    description: "Elements necessaires a l'analyse du financement.",
    firestoreTypes: ["bank_document", "payment_proof"],
  },
];

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
  const db = getFirebaseDb();
  const documentsQuery = query(
    collection(db, "documents"),
    where("ownerId", "==", uid),
  );
  const snapshot = await getDocs(documentsQuery);
  const documents = snapshot.docs.map((documentSnapshot) =>
    mapDocumentSnapshot(documentSnapshot.id, documentSnapshot.data()),
  );

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

  return {
    uid: String(data.uid ?? uid),
    fullName: typeof data.fullName === "string" ? data.fullName : null,
    email: typeof data.email === "string" ? data.email : null,
    role: typeof data.role === "string" ? data.role : null,
    createdAt: toDate(data.createdAt),
  };
}
