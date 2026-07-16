import {
  getAdminAuth,
  getAdminFirestore,
  getAdminStorage,
} from "@/lib/firebase/admin";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { sendDocumentRequestEmail } from "@/lib/server/email.service";
import {
  documentTypeLabels,
  documentTypeValues,
} from "@/lib/validations/document";
import type {
  AdminCaseCertificateStatus,
  AdminCaseDocumentStatus,
  AdminCaseEvent,
  AdminCaseFinanceStatus,
  AdminCasePaymentStatus,
  AdminCaseStatus,
  AdminClient360,
  AdminClientProfile,
  CommunicationLog,
  AdminNotification,
  AdminOperationsOverview,
  ClientCase,
  ClientDocument,
  ClientFinancialFile,
} from "@/types/admin-ops";

type StoreState = {
  clients: AdminClientProfile[];
  cases: ClientCase[];
  documents: ClientDocument[];
  financialFiles: ClientFinancialFile[];
  payments: Array<Record<string, unknown>>;
  notifications: AdminNotification[];
  events: AdminCaseEvent[];
  communications: CommunicationLog[];
};

type ListClientFilters = {
  status?: string | null;
  productType?: string | null;
  country?: string | null;
  missingDocuments?: string | null;
  paymentStatus?: string | null;
  query?: string | null;
};

type ListCaseFilters = {
  status?: string | null;
  productType?: string | null;
  query?: string | null;
};

declare global {
  var __aviAdminOpsState: StoreState | undefined;
}

const state =
  globalThis.__aviAdminOpsState ??
  (globalThis.__aviAdminOpsState = {
    clients: [],
    cases: [],
    documents: [],
    financialFiles: [],
    payments: [],
    notifications: [],
    events: [],
    communications: [],
  });

state.payments ??= [];

let fallbackWarningLogged = false;

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function todayStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function hasFirebaseAdminEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function assertLocalFallbackAllowed() {
  if (hasFirebaseAdminEnv()) return;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Firebase Admin configuration is required for admin operations storage in production. In-memory fallback is disabled.",
    );
  }

  if (!fallbackWarningLogged && process.env.NODE_ENV !== "test") {
    console.warn(
      "AVI admin operations store is using process-local fallback storage. This is allowed only for development and tests.",
    );
    fallbackWarningLogged = true;
  }
}

function collection(name: string) {
  assertLocalFallbackAllowed();
  return hasFirebaseAdminEnv() ? getAdminFirestore().collection(name) : null;
}

async function getAllDocs<T>(name: string, fallback: T[]) {
  const ref = collection(name);
  if (!ref) return fallback;

  const snapshot = await ref.get();
  return snapshot.docs.map((doc) => doc.data() as T);
}

async function getAllDocsWithIds(name: string) {
  const ref = collection(name);
  if (!ref) return [] as Array<Record<string, unknown> & { id: string }>;

  const snapshot = await ref.get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
}

async function upsertDoc<T>(
  name: string,
  docId: string,
  value: T,
  fallback: T[],
  getFallbackId: (item: T) => string | undefined,
) {
  const ref = collection(name);
  if (ref) {
    await ref.doc(docId).set(value as Record<string, unknown>, { merge: true });
  }

  const index = fallback.findIndex((item) => getFallbackId(item) === docId);
  if (index >= 0) {
    fallback[index] = { ...fallback[index], ...value };
  } else {
    fallback.unshift(value);
  }
}

function sortNewest<T extends { createdAt?: string; updatedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? "") || 0;
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? "") || 0;
    return bTime - aTime;
  });
}

function matchesText(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query.toLowerCase());
}

function normalizedEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? null;
}

function normalizedPhone(value: string | null | undefined) {
  return value?.replace(/[^+\d]/g, "") ?? null;
}

function stringField(
  value: Record<string, unknown> | null | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const candidate = value?.[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function documentBelongsToClient(
  document: ClientDocument,
  uid: string,
  caseIds: Set<string>,
  email: string | null,
  includeEmail = false,
) {
  return (
    document.uid === uid ||
    Boolean(document.caseId && caseIds.has(document.caseId)) ||
    Boolean(
      includeEmail &&
      email &&
        document.clientEmail &&
        normalizedEmail(document.clientEmail) === email,
    )
  );
}

function isoDate(value: unknown) {
  if (typeof value === "string") return value;

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function normalizedVerificationStatus(data: Record<string, unknown>) {
  const explicitStatus =
    typeof data.verificationStatus === "string"
      ? data.verificationStatus.toUpperCase()
      : "";
  const allowedStatuses = new Set<ClientDocument["verificationStatus"]>([
    "REQUESTED",
    "UPLOADED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "PENDING",
    "CORRECTION_REQUESTED",
  ]);

  if (
    allowedStatuses.has(
      explicitStatus as ClientDocument["verificationStatus"],
    )
  ) {
    return explicitStatus as ClientDocument["verificationStatus"];
  }

  const status = String(data.status ?? data.uploadStatus ?? "pending").toLowerCase();
  const statusMap: Record<string, ClientDocument["verificationStatus"]> = {
    requested: "REQUESTED",
    uploaded: "UPLOADED",
    under_review: "UNDER_REVIEW",
    generated: "APPROVED",
    approved: "APPROVED",
    validated: "APPROVED",
    rejected: "REJECTED",
    expired: "EXPIRED",
    correction_requested: "CORRECTION_REQUESTED",
  };

  return statusMap[status] ?? "PENDING";
}

function mapPublicDocument(
  documentId: string,
  data: Record<string, unknown>,
): ClientDocument {
  return {
    id: documentId,
    uid: String(
      data.ownerId ?? data.uid ?? data.userId ?? data.clientId ?? "",
    ),
    caseId: typeof data.caseId === "string" ? data.caseId : null,
    clientEmail:
      typeof data.clientEmail === "string"
        ? data.clientEmail
        : typeof data.email === "string"
          ? data.email
          : null,
    clientName: typeof data.clientName === "string" ? data.clientName : null,
    documentType: String(data.documentType ?? "other"),
    fileName: String(data.originalFileName ?? data.safeFileName ?? documentId),
    storagePath: String(data.storagePath ?? ""),
    mimeType: typeof data.contentType === "string" ? data.contentType : null,
    size: typeof data.size === "number" ? data.size : null,
    downloadUrl: null,
    uploadStatus: String(data.uploadStatus ?? data.status ?? "pending"),
    verificationStatus: normalizedVerificationStatus(data),
    rejectionReason:
      typeof data.rejectionReason === "string" ? data.rejectionReason : null,
    requestedAt:
      isoDate(data.requestedAt) ??
      (String(data.status ?? "").toLowerCase() === "requested"
        ? isoDate(data.createdAt)
        : null),
    uploadedAt:
      isoDate(data.uploadedAt) ??
      isoDate(data.createdAt) ??
      isoDate(data.updatedAt),
    verifiedAt: isoDate(data.verifiedAt),
    verifiedBy: typeof data.verifiedBy === "string" ? data.verifiedBy : null,
    source:
      data.source === "ADMIN" || data.source === "SYSTEM"
        ? data.source
        : "CLIENT",
    uploadedBy: typeof data.uploadedBy === "string" ? data.uploadedBy : null,
    expiresAt: isoDate(data.expiresAt),
    isRequired: Boolean(data.isRequired),
    deliveryStatus:
      data.deliveryStatus === "SENT" ||
      data.deliveryStatus === "FAILED" ||
      data.deliveryStatus === "QUEUED" ||
      data.deliveryStatus === "DELIVERED"
        ? data.deliveryStatus
        : null,
  };
}

function mergeDocumentMetadata(
  publicDocument: ClientDocument,
  operationsDocument: ClientDocument,
): ClientDocument {
  const publicFileIsUploaded =
    Boolean(publicDocument.storagePath) &&
    ["UPLOADED", "UNDER_REVIEW", "APPROVED"].includes(
      publicDocument.verificationStatus,
    );
  const operationsStatusIsPreUpload = ["REQUESTED", "PENDING"].includes(
    operationsDocument.verificationStatus,
  );

  return {
    ...publicDocument,
    ...operationsDocument,
    uid: operationsDocument.uid || publicDocument.uid,
    caseId: operationsDocument.caseId ?? publicDocument.caseId,
    clientEmail:
      operationsDocument.clientEmail ?? publicDocument.clientEmail ?? null,
    clientName:
      operationsDocument.clientName ?? publicDocument.clientName ?? null,
    fileName: operationsDocument.fileName || publicDocument.fileName,
    storagePath:
      operationsDocument.storagePath || publicDocument.storagePath,
    mimeType: operationsDocument.mimeType ?? publicDocument.mimeType ?? null,
    size: operationsDocument.size ?? publicDocument.size ?? null,
    downloadUrl: null,
    uploadStatus:
      publicFileIsUploaded && operationsStatusIsPreUpload
        ? publicDocument.uploadStatus
        : operationsDocument.uploadStatus || publicDocument.uploadStatus,
    verificationStatus:
      publicFileIsUploaded && operationsStatusIsPreUpload
        ? publicDocument.verificationStatus
        : operationsDocument.verificationStatus,
    uploadedAt:
      operationsDocument.uploadedAt ?? publicDocument.uploadedAt ?? null,
    requestedAt:
      operationsDocument.requestedAt ?? publicDocument.requestedAt ?? null,
    source: operationsDocument.source ?? publicDocument.source,
    uploadedBy:
      operationsDocument.uploadedBy ?? publicDocument.uploadedBy ?? null,
  };
}

function caseNumberFor(uid: string) {
  let hash = 0;
  for (const char of uid) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000;
  }
  return `AVI-${new Date().getFullYear()}-${String(hash).padStart(6, "0")}`;
}

function normalizeClient(raw: Record<string, unknown>, uid: string): AdminClientProfile {
  const timestamp = now();
  return {
    uid,
    email: typeof raw.email === "string" ? raw.email : null,
    fullName: typeof raw.fullName === "string" ? raw.fullName : null,
    phone:
      typeof raw.phone === "string"
        ? raw.phone
        : typeof raw.phoneWhatsApp === "string"
          ? raw.phoneWhatsApp
          : null,
    countryOfOrigin:
      typeof raw.countryOfOrigin === "string"
        ? raw.countryOfOrigin
        : typeof raw.countryOfResidence === "string"
          ? raw.countryOfResidence
          : null,
    destinationCountry:
      typeof raw.destinationCountry === "string" ? raw.destinationCountry : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : timestamp,
    lastLoginAt: typeof raw.lastLoginAt === "string" ? raw.lastLoginAt : null,
    accountStatus:
      raw.accountStatus === "DISABLED" || raw.accountStatus === "ACTIVE"
        ? raw.accountStatus
        : "UNKNOWN",
    onboardingStatus:
      raw.onboardingStatus === "COMPLETE" || raw.onboardingStatus === "IN_PROGRESS"
        ? raw.onboardingStatus
        : "NOT_STARTED",
    currentCaseId: typeof raw.currentCaseId === "string" ? raw.currentCaseId : null,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === "string") : [],
    priority:
      raw.priority === "LOW" ||
      raw.priority === "HIGH" ||
      raw.priority === "URGENT"
        ? raw.priority
        : "NORMAL",
    assignedAdminId:
      typeof raw.assignedAdminId === "string" ? raw.assignedAdminId : null,
    source:
      raw.source === "user_profile" || raw.source === "admin_created"
        ? raw.source
        : "firebase_auth_sync",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : timestamp,
  };
}

function mapAuthUser(user: {
  uid: string;
  email?: string;
  displayName?: string;
  phoneNumber?: string;
  disabled: boolean;
  metadata: { creationTime?: string; lastSignInTime?: string };
}): AdminClientProfile {
  const timestamp = now();
  return {
    uid: user.uid,
    email: user.email ?? null,
    fullName: user.displayName ?? null,
    phone: user.phoneNumber ?? null,
    countryOfOrigin: null,
    destinationCountry: null,
    createdAt: user.metadata.creationTime
      ? new Date(user.metadata.creationTime).toISOString()
      : timestamp,
    lastLoginAt: user.metadata.lastSignInTime
      ? new Date(user.metadata.lastSignInTime).toISOString()
      : null,
    accountStatus: user.disabled ? "DISABLED" : "ACTIVE",
    onboardingStatus: "NOT_STARTED",
    currentCaseId: null,
    tags: ["firebase_auth_sync"],
    priority: "NORMAL",
    assignedAdminId: null,
    source: "firebase_auth_sync",
    updatedAt: timestamp,
  };
}

function computeDocumentStatus(documents: ClientDocument[]): AdminCaseDocumentStatus {
  if (!documents.length) return "MISSING";
  if (documents.some((document) => document.verificationStatus === "REJECTED")) return "REJECTED";
  if (documents.every((document) => document.verificationStatus === "APPROVED")) return "VERIFIED";
  if (documents.some((document) => document.verificationStatus === "UPLOADED" || document.verificationStatus === "UNDER_REVIEW" || document.verificationStatus === "PENDING")) return "SUBMITTED";
  if (documents.some((document) => document.verificationStatus === "REQUESTED")) return "MISSING";
  return "PARTIAL";
}

function computeFinanceStatus(files: ClientFinancialFile[]): AdminCaseFinanceStatus {
  if (files.some((file) => file.status === "REPORTED" || file.reportId)) return "REPORT_GENERATED";
  if (files.some((file) => file.status === "SENT")) return "SENT_TO_CLIENT";
  if (files.some((file) => file.status === "QUOTED" || file.quoteId)) return "QUOTE_GENERATED";
  if (files.some((file) => file.status === "SIMULATED" || file.simulationId)) return "SIMULATED";
  return "NOT_STARTED";
}

function computePaymentStatus(clientCase: ClientCase): AdminCasePaymentStatus {
  if (clientCase.paymentStatus) return clientCase.paymentStatus;
  if (clientCase.status === "PAYMENT_CONFIRMED") return "CONFIRMED";
  if (clientCase.status === "PAYMENT_PENDING") return "PENDING";
  return "NOT_STARTED";
}

function computeCertificateStatus(
  clientCase: ClientCase,
  documents: ClientDocument[],
): AdminCaseCertificateStatus {
  if (clientCase.certificateStatus) return clientCase.certificateStatus;
  if (clientCase.status === "CERTIFICATE_GENERATED" || clientCase.status === "AVI_READY") {
    return "GENERATED";
  }
  return documents.some((document) => document.documentType.includes("certificate"))
    ? "GENERATED"
    : "NOT_STARTED";
}

function computeNextAction(input: {
  clientCase: ClientCase;
  documentStatus: AdminCaseDocumentStatus;
  paymentStatus: AdminCasePaymentStatus;
  financeStatus: AdminCaseFinanceStatus;
  certificateStatus: AdminCaseCertificateStatus;
}) {
  if (input.clientCase.status === "BLOCKED") return "Traiter le blocage dossier";
  if (input.clientCase.productType === "TO_QUALIFY" || input.clientCase.status === "NEW") {
    return "Qualifier la demande client";
  }
  if (input.documentStatus === "MISSING" || input.documentStatus === "PARTIAL") {
    return "Demander les documents manquants";
  }
  if (input.documentStatus === "SUBMITTED") return "Vérifier les documents soumis";
  if (input.paymentStatus === "PENDING") return "Relancer paiement";
  if (input.financeStatus === "NOT_STARTED") return "Générer simulation";
  if (input.financeStatus === "SIMULATED") return "Générer devis";
  if (input.financeStatus === "QUOTE_GENERATED") return "Générer rapport";
  if (input.financeStatus === "SENT_TO_CLIENT") return "Générer rapport";
  if (input.certificateStatus === "NOT_STARTED") return "Générer attestation";
  return "Dossier complet";
}

function statusFromFinance(financeStatus: AdminCaseFinanceStatus): AdminCaseStatus {
  if (financeStatus === "REPORT_GENERATED") return "REPORT_GENERATED";
  if (financeStatus === "SENT_TO_CLIENT") return "QUOTE_GENERATED";
  if (financeStatus === "QUOTE_GENERATED") return "QUOTE_GENERATED";
  if (financeStatus === "SIMULATED") return "FINANCE_SIMULATED";
  return "NEW";
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasOperationalProfileSignal(client: AdminClientProfile) {
  if (client.source === "admin_created") return true;
  if (client.source !== "user_profile") return false;

  return (
    hasText(client.fullName) &&
    (hasText(client.phone) ||
      hasText(client.countryOfOrigin) ||
      hasText(client.destinationCountry))
  );
}

function paymentBelongsToClient(
  payment: Record<string, unknown>,
  client: AdminClientProfile,
) {
  const ownerId = payment.ownerId ?? payment.uid ?? payment.userId;

  return ownerId === client.uid;
}

function mapPaymentSignalStatus(
  payments: Array<Record<string, unknown>>,
): AdminCasePaymentStatus | null {
  const statuses = payments.map((payment) =>
    typeof payment.status === "string" ? payment.status.toLowerCase() : "",
  );

  if (statuses.some((status) => status === "paid" || status === "succeeded")) {
    return "CONFIRMED";
  }

  if (statuses.some((status) => status === "failed")) {
    return "FAILED";
  }

  if (statuses.some((status) => status === "refunded")) {
    return "REFUNDED";
  }

  if (
    statuses.some((status) =>
      ["pending", "created", "open", "processing"].includes(status),
    )
  ) {
    return "PENDING";
  }

  return null;
}

function hasCaseMaterializationSignal({
  client,
  existingCase,
  documents,
  financialFiles,
  payments,
}: {
  client: AdminClientProfile;
  existingCase: ClientCase | null;
  documents: ClientDocument[];
  financialFiles: ClientFinancialFile[];
  payments: Array<Record<string, unknown>>;
}) {
  if (existingCase) return true;
  if (hasText(client.currentCaseId)) return true;
  if (hasOperationalProfileSignal(client)) return true;
  if (documents.some((document) => document.uid === client.uid)) return true;
  if (financialFiles.some((file) => file.uid === client.uid)) return true;
  if (payments.some((payment) => paymentBelongsToClient(payment, client))) {
    return true;
  }

  return false;
}

function defaultCaseSourceFor(client: AdminClientProfile): ClientCase["source"] {
  if (client.source === "admin_created") return "admin_created";
  if (client.source === "user_profile") return "client_request";

  return "reconciliation";
}

export class AdminOperationsStore {
  private async loadDocumentSources() {
    const operationsDocuments = await getAllDocs<ClientDocument>(
      "client_documents",
      state.documents,
    );
    if (!hasFirebaseAdminEnv()) {
      return {
        documents: sortNewest(
          operationsDocuments.map((document) => ({
            ...document,
            createdAt: document.uploadedAt ?? "",
          })),
        ),
        publicDocuments: [] as ClientDocument[],
        operationsDocuments,
      };
    }

    // Client 360 promises complete visibility. A global limit silently hid
    // documents once the collection exceeded the first 200 Firestore rows.
    const snapshot = await getAdminFirestore().collection("documents").get();
    const publicDocuments = snapshot.docs.map((doc) =>
      mapPublicDocument(doc.id, doc.data()),
    );
    const byId = new Map<string, ClientDocument>(
      publicDocuments.map((document) => [document.id, document]),
    );

    for (const document of operationsDocuments) {
      const publicDocument = byId.get(document.id);
      byId.set(
        document.id,
        publicDocument
          ? mergeDocumentMetadata(publicDocument, document)
          : document,
      );
    }

    return {
      documents: sortNewest(
        [...byId.values()].map((document) => ({
          ...document,
          createdAt: document.uploadedAt ?? document.requestedAt ?? "",
        })),
      ),
      publicDocuments,
      operationsDocuments,
    };
  }

  async listDocumentsWithOwners() {
    const documents = await this.listDocuments();
    if (!documents.length) return documents;

    const ownerIds = [...new Set(documents.map((document) => document.uid).filter(Boolean))];
    const [adminProfiles, users, rawCases, leads] = hasFirebaseAdminEnv()
      ? await Promise.all([
          getAllDocsWithIds("admin_client_profiles"),
          getAllDocsWithIds("users"),
          getAllDocsWithIds("client_cases"),
          getAllDocsWithIds("leads"),
        ])
      : [
          state.clients.map((client) => ({ id: client.uid, ...client })),
          [],
          state.cases.map((clientCase) => ({ ...clientCase })),
          [],
        ];

    const profileByUid = new Map(
      adminProfiles.map((profile) => [
        stringField(profile, "uid", "userId", "ownerId") ?? profile.id,
        profile,
      ]),
    );
    const userByUid = new Map(
      users.map((user) => [
        stringField(user, "uid", "userId", "ownerId") ?? user.id,
        user,
      ]),
    );
    const casesByUid = new Map<string, Array<Record<string, unknown> & { id: string }>>();
    for (const clientCase of rawCases) {
      const caseUid = stringField(
        clientCase,
        "uid",
        "ownerId",
        "userId",
        "clientId",
      );
      if (!caseUid) continue;
      casesByUid.set(caseUid, [...(casesByUid.get(caseUid) ?? []), clientCase]);
    }

    const authByUid = new Map<string, AdminClientProfile>();
    if (hasFirebaseAdminEnv()) {
      const authCandidateUids = ownerIds.filter(
        (ownerId) => !profileByUid.has(ownerId) && !userByUid.has(ownerId),
      );

      for (let index = 0; index < authCandidateUids.length; index += 100) {
        const chunk = authCandidateUids.slice(index, index + 100);
        try {
          const result = await getAdminAuth().getUsers(
            chunk.map((uid) => ({ uid })),
          );
          for (const user of result.users) {
            authByUid.set(user.uid, mapAuthUser(user));
          }
        } catch {
          // A failed batch must not hide otherwise downloadable documents.
        }
      }
    }

    return documents.map((document) => {
      const adminProfile = profileByUid.get(document.uid) ?? null;
      const userProfile = userByUid.get(document.uid) ?? null;
      const authProfile = authByUid.get(document.uid) ?? null;
      const directCases = casesByUid.get(document.uid) ?? [];
      const directCase = directCases[0] ?? null;
      const emails = [
        stringField(adminProfile, "email"),
        stringField(userProfile, "email"),
        authProfile?.email ?? null,
        stringField(directCase, "clientEmail", "email"),
        document.clientEmail ?? null,
      ].filter((value): value is string => Boolean(value));
      const email = emails[0] ?? null;
      const casesMatchedByEmail = email
        ? rawCases.filter(
            (clientCase) =>
              normalizedEmail(
                stringField(clientCase, "clientEmail", "email"),
              ) === normalizedEmail(email),
          )
        : [];
      const clientCases = [
        ...new Map(
          [...directCases, ...casesMatchedByEmail].map((clientCase) => [
            clientCase.id,
            clientCase,
          ]),
        ).values(),
      ];
      const clientCase = clientCases[0] ?? null;
      const phone =
        stringField(adminProfile, "phone", "phoneNumber", "phoneWhatsApp") ??
        stringField(userProfile, "phone", "phoneNumber", "phoneWhatsApp") ??
        authProfile?.phone ??
        stringField(clientCase, "phone", "phoneNumber");
      const matchingLeads = leads.filter((lead) => {
        const leadEmail = normalizedEmail(stringField(lead, "email"));
        const leadPhone = normalizedPhone(
          stringField(lead, "phone", "phoneNumber"),
        );

        return Boolean(
          (email && leadEmail === normalizedEmail(email)) ||
            (phone && leadPhone === normalizedPhone(phone)),
        );
      });
      const lead = matchingLeads[0] ?? null;
      const source: NonNullable<ClientDocument["ownerResolution"]>["source"] =
        adminProfile
          ? "admin_client_profile"
          : userProfile
            ? "users"
            : lead
              ? "lead_match"
              : authProfile
                ? "auth"
                : clientCase
                  ? "client_case"
                  : email
                    ? "document_metadata"
                    : "unresolved";
      const fullName =
        stringField(adminProfile, "fullName", "displayName", "name") ??
        stringField(lead, "fullName", "displayName", "name") ??
        stringField(userProfile, "fullName", "displayName", "name") ??
        authProfile?.fullName ??
        stringField(clientCase, "clientName", "fullName", "name");
      const distinctEmails = new Set(emails.map(normalizedEmail).filter(Boolean));
      const warning =
        distinctEmails.size > 1
          ? "Plusieurs emails sont associés à cet UID. Validation humaine requise."
          : matchingLeads.length > 1
            ? "Plusieurs prospects correspondent à cette identité. Aucun rattachement automatique effectué."
            : clientCases.length > 1
              ? "Plusieurs dossiers correspondent à cette identité. Aucun rattachement automatique effectué."
            : null;
      const status: NonNullable<ClientDocument["ownerResolution"]>["status"] =
        source === "unresolved"
          ? "UNRESOLVED"
          : !clientCase && lead
            ? "LEAD_NOT_CONVERTED"
            : !adminProfile && !clientCase
              ? "PROFILE_SYNC_REQUIRED"
              : "RESOLVED";
      const canOpenClient360 = Boolean(
        adminProfile || userProfile || authProfile || clientCase,
      );

      return {
        ...document,
        clientName: fullName ?? document.clientName ?? null,
        clientEmail: email ?? document.clientEmail ?? null,
        ownerResolution: {
          uid: document.uid,
          fullName,
          email,
          phone,
          source,
          status,
          caseId: clientCase?.id ?? document.caseId ?? null,
          leadId: lead?.id ?? null,
          canOpenClient360,
          warning,
        },
      };
    });
  }

  async upsertDefaultCase(client: AdminClientProfile, actor?: AdminActor) {
    const existingCases = await this.listCases();
    const existingCase = existingCases.find((clientCase) => clientCase.uid === client.uid);
    if (existingCase) return { case: existingCase, created: false };

    const timestamp = now();
    const caseSource = defaultCaseSourceFor(client);
    const clientCase: ClientCase = {
      id: id("case"),
      uid: client.uid,
      caseNumber: caseNumberFor(client.uid),
      clientEmail: client.email,
      clientName: client.fullName ?? client.email?.split("@")[0] ?? null,
      productType: "TO_QUALIFY",
      status: client.fullName || client.email ? "NEW" : "PROFILE_INCOMPLETE",
      priority: client.priority,
      requestedAmount: null,
      requestedCurrency: null,
      region: null,
      destinationCountry: client.destinationCountry,
      destinationSchool: null,
      schoolName: null,
      intakeDate: null,
      paymentStatus: "NOT_STARTED",
      documentStatus: "MISSING",
      financeStatus: "NOT_STARTED",
      certificateStatus: "NOT_STARTED",
      nextAction: "Qualifier la demande client",
      assignedAdminId: client.assignedAdminId,
      notes: "Dossier opérationnel créé depuis la réconciliation admin.",
      source: caseSource,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await upsertDoc("client_cases", clientCase.id, clientCase, state.cases, (item) => item.id);
    await this.createEvent({
      caseId: clientCase.id,
      uid: client.uid,
      actorType: actor ? "admin" : "system",
      actorId: actor?.uid ?? "system",
      actorRole: actor?.role ?? "system",
      eventType: "case_reconciled",
      eventLabel: "Dossier opérationnel créé",
      eventPayload: { source: caseSource, caseNumber: clientCase.caseNumber },
    });

    return { case: clientCase, created: true };
  }

  async listClients(filters: ListClientFilters = {}) {
    const clients = await getAllDocs<AdminClientProfile>("admin_client_profiles", state.clients);
    const query = filters.query?.trim();

    return sortNewest(clients).filter((client) => {
      if (filters.status && client.accountStatus !== filters.status) return false;
      if (
        filters.country &&
        client.destinationCountry !== filters.country &&
        client.countryOfOrigin !== filters.country
      ) {
        return false;
      }
      if (
        query &&
        !matchesText(client.fullName, query) &&
        !matchesText(client.email, query) &&
        !matchesText(client.uid, query)
      ) {
        return false;
      }
      return true;
    });
  }

  async getClient360(uid: string): Promise<AdminClient360> {
    const [clients, cases, documentSources, financialFiles, events, communications] = await Promise.all([
      this.listClients(),
      this.listCases({}),
      this.loadDocumentSources(),
      this.listFinancialFiles(),
      this.listEvents(),
      this.listCommunications(),
    ]);

    let profile = clients.find((client) => client.uid === uid) ?? null;
    if (!profile && hasFirebaseAdminEnv()) {
      const userSnapshot = await getAdminFirestore()
        .collection("users")
        .doc(uid)
        .get();

      if (userSnapshot.exists) {
        profile = normalizeClient(
          { ...userSnapshot.data(), source: "user_profile" },
          uid,
        );
      } else {
        try {
          profile = mapAuthUser(await getAdminAuth().getUser(uid));
        } catch {
          profile = null;
        }
      }
    }
    const clientCases = cases.filter((clientCase) => clientCase.uid === uid);
    const caseIds = new Set(clientCases.map((clientCase) => clientCase.id));
    const email = normalizedEmail(profile?.email);
    const documents = documentSources.documents.filter((document) =>
      documentBelongsToClient(document, uid, caseIds, email),
    );
    const publicDocuments = documentSources.publicDocuments.filter((document) =>
      documentBelongsToClient(document, uid, caseIds, email, true),
    );
    const operationsDocuments = documentSources.operationsDocuments.filter(
      (document) => documentBelongsToClient(document, uid, caseIds, email, true),
    );
    let authUid: string | null = null;
    let diagnosticError: string | null = null;

    if (hasFirebaseAdminEnv() && email) {
      try {
        authUid = (await getAdminAuth().getUserByEmail(email)).uid;
      } catch {
        diagnosticError = "Firebase Auth lookup failed.";
      }
    }

    let storageStatus: "CHECKED" | "NOT_CONFIGURED" | "ERROR" =
      hasFirebaseAdminEnv() ? "CHECKED" : "NOT_CONFIGURED";
    let storageBucketName: string | null = null;
    let storageFileCount: number | null = null;
    let orphanedFileCount: number | null = null;

    if (hasFirebaseAdminEnv()) {
      try {
        const bucket = getAdminStorage().bucket();
        storageBucketName = bucket.name;
        const [files] = await bucket.getFiles({
          prefix: `users/${authUid ?? uid}/documents/`,
        });
        const knownPaths = new Set(
          [...publicDocuments, ...operationsDocuments]
            .map((document) => document.storagePath)
            .filter(Boolean),
        );
        storageFileCount = files.length;
        orphanedFileCount = files.filter((file) => !knownPaths.has(file.name)).length;
      } catch {
        storageStatus = "ERROR";
        diagnosticError ??= "Firebase Storage lookup failed.";
      }
    }

    const diagnosticMessage =
      authUid && authUid !== uid
        ? "L'UID Firebase Auth diffère de l'UID du profil Client 360."
        : storageStatus === "ERROR"
          ? "Le contrôle Storage n'a pas pu être terminé."
          : orphanedFileCount && orphanedFileCount > 0
            ? "Fichiers détectés dans Storage sans métadonnées Firestore."
            : documents.length === 0 && storageFileCount === 0
              ? "Aucune soumission persistée dans Firestore ou Storage pour ce client."
              : documents.length === 0
                ? "Aucune métadonnée Firestore rattachée à ce client."
                : "Rattachement documentaire vérifié.";

    return {
      profile,
      cases: clientCases,
      documents,
      documentDiagnostics: {
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
        resolvedUid: uid,
        authUid,
        email: profile?.email ?? null,
        caseIds: [...caseIds],
        firestoreCounts: {
          documents: publicDocuments.length,
          clientDocuments: operationsDocuments.length,
        },
        storage: {
          status: storageStatus,
          bucketName: storageBucketName,
          fileCount: storageFileCount,
          orphanedFileCount,
        },
        sourcesQueried: [
          "documents.ownerId",
          "documents.caseId",
          "documents.email",
          "client_documents.uid",
          "client_documents.caseId",
          "client_documents.email",
          `storage.users/${authUid ?? uid}/documents`,
        ],
        lastRefresh: now(),
        message: diagnosticMessage,
        error: diagnosticError,
      },
      payments: [],
      financialFiles: financialFiles.filter((file) => file.uid === uid || caseIds.has(file.caseId)),
      certificates: documents
        .filter((document) => document.uid === uid && document.documentType.includes("certificate"))
        .map((document) => ({
          id: document.id,
          documentType: document.documentType,
          status: document.verificationStatus,
        })),
      communications: communications.filter((log) => log.uid === uid || Boolean(log.caseId && caseIds.has(log.caseId))),
      timeline: events.filter((event) => event.uid === uid || Boolean(event.caseId && caseIds.has(event.caseId))),
    };
  }

  async listCases(filters: ListCaseFilters = {}) {
    const [rawCases, documents, financialFiles] = await Promise.all([
      getAllDocs<ClientCase>("client_cases", state.cases),
      this.listDocuments(),
      this.listFinancialFiles(),
    ]);
    const cases = rawCases.map((clientCase) => {
      const caseDocuments = documents.filter(
        (document) => document.caseId === clientCase.id || document.uid === clientCase.uid,
      );
      const caseFinancialFiles = financialFiles.filter(
        (file) => file.caseId === clientCase.id || file.uid === clientCase.uid,
      );
      const documentStatus = computeDocumentStatus(caseDocuments);
      const financeStatus = computeFinanceStatus(caseFinancialFiles);
      const paymentStatus = computePaymentStatus(clientCase);
      const certificateStatus = computeCertificateStatus(clientCase, caseDocuments);

      return {
        ...clientCase,
        clientName: clientCase.clientName ?? null,
        clientEmail: clientCase.clientEmail ?? null,
        priority: clientCase.priority ?? "NORMAL",
        region: clientCase.region ?? null,
        destinationSchool: clientCase.destinationSchool ?? clientCase.schoolName ?? null,
        paymentStatus,
        documentStatus,
        financeStatus,
        certificateStatus,
        nextAction: computeNextAction({
          clientCase,
          documentStatus,
          paymentStatus,
          financeStatus,
          certificateStatus,
        }),
        assignedAdminId: clientCase.assignedAdminId ?? null,
      } satisfies ClientCase;
    });
    const query = filters.query?.trim();

    return sortNewest(cases).filter((clientCase) => {
      if (filters.status && clientCase.status !== filters.status) return false;
      if (filters.productType && clientCase.productType !== filters.productType) return false;
      if (
        query &&
        !matchesText(clientCase.caseNumber, query) &&
        !matchesText(clientCase.schoolName, query) &&
        !matchesText(clientCase.clientName, query) &&
        !matchesText(clientCase.clientEmail, query) &&
        !matchesText(clientCase.uid, query)
      ) {
        return false;
      }
      return true;
    });
  }

  async getCase(caseId: string) {
    const cases = await this.listCases();
    return cases.find((clientCase) => clientCase.id === caseId) ?? null;
  }

  async updateCaseStatus(caseId: string, status: AdminCaseStatus, actor: AdminActor) {
    const clientCase = await this.getCase(caseId);
    if (!clientCase) throw new Error("Client case not found.");

    const updatedCase = {
      ...clientCase,
      status,
      nextAction: status === "UNDER_REVIEW" ? "Vérifier les documents soumis" : clientCase.nextAction,
      updatedAt: now(),
    };
    await upsertDoc("client_cases", caseId, updatedCase, state.cases, (item) => item.id);
    await this.createEvent({
      caseId,
      uid: clientCase.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "case_status_updated",
      eventLabel: `Statut dossier mis à jour: ${status}`,
      eventPayload: { status },
    });

    return updatedCase;
  }

  async listDocuments() {
    return (await this.loadDocumentSources()).documents;
  }

  async listCaseDocuments(caseId: string) {
    const documents = await this.listDocuments();
    return documents.filter((document) => document.caseId === caseId);
  }

  async listCommunications() {
    return sortNewest(await getAllDocs<CommunicationLog>("communication_logs", state.communications));
  }

  async listCaseCommunications(caseId: string) {
    const communications = await this.listCommunications();
    return communications.filter((log) => log.caseId === caseId);
  }

  async createCommunicationLog(input: Omit<CommunicationLog, "id" | "createdAt">) {
    const communication: CommunicationLog = {
      ...input,
      id: id("comm"),
      createdAt: now(),
    };
    await upsertDoc(
      "communication_logs",
      communication.id,
      communication,
      state.communications,
      (item) => item.id,
    );
    return communication;
  }

  private async mirrorClientDocumentMetadata(document: ClientDocument, status: string) {
    if (!hasFirebaseAdminEnv()) return;

    await getAdminFirestore()
      .collection("documents")
      .doc(document.id)
      .set(
        {
          ownerId: document.uid,
          uid: document.uid,
          caseId: document.caseId,
          documentType: document.documentType,
          status,
          originalFileName: document.fileName,
          safeFileName: document.fileName,
          contentType: document.mimeType ?? "application/pdf",
          size: document.size ?? 0,
          storagePath: document.storagePath,
          source: document.source ?? "SYSTEM",
          isRequired: Boolean(document.isRequired),
          requestedAt: document.requestedAt ?? document.uploadedAt ?? now(),
          adminComment: document.rejectionReason ?? null,
          deliveryStatus: document.deliveryStatus ?? null,
          rejectionReason: document.rejectionReason ?? null,
          verifiedAt: document.verifiedAt ?? null,
          verifiedBy: document.verifiedBy ?? null,
          updatedAt: now(),
          createdAt: document.requestedAt ?? document.uploadedAt ?? now(),
        },
        { merge: true },
      );
  }

  async verifyDocument(
    documentId: string,
    input: { verificationStatus: ClientDocument["verificationStatus"]; rejectionReason?: string },
    actor: AdminActor,
  ) {
    const document = (await this.listDocuments()).find((item) => item.id === documentId);
    if (!document) throw new Error("Client document not found.");
    if (input.verificationStatus === "REJECTED" && !input.rejectionReason?.trim()) {
      throw new Error("A rejection reason is required.");
    }

    const updatedDocument: ClientDocument = {
      ...document,
      verificationStatus: input.verificationStatus,
      uploadStatus:
        input.verificationStatus === "APPROVED"
          ? "approved"
          : input.verificationStatus === "REJECTED"
            ? "rejected"
            : document.uploadStatus,
      rejectionReason: input.rejectionReason ?? null,
      verifiedAt: now(),
      verifiedBy: actor.uid,
    };
    await upsertDoc("client_documents", documentId, updatedDocument, state.documents, (item) => item.id);
    await this.mirrorClientDocumentMetadata(
      updatedDocument,
      input.verificationStatus === "APPROVED"
        ? "approved"
        : input.verificationStatus === "REJECTED"
          ? "rejected"
          : "under_review",
    );
    await this.createEvent({
      caseId: document.caseId,
      uid: document.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "document_verified",
      eventLabel: `Document ${input.verificationStatus.toLowerCase()}`,
      eventPayload: { documentId, verificationStatus: input.verificationStatus, rejectionReason: input.rejectionReason ?? null },
    });

    if (document.caseId) {
      const clientCase = await this.getCase(document.caseId);
      if (clientCase) {
        const caseDocuments = (await this.listDocuments()).filter(
          (item) => item.caseId === document.caseId || item.uid === clientCase.uid,
        );
        const documentStatus = computeDocumentStatus(caseDocuments);
        await upsertDoc(
          "client_cases",
          clientCase.id,
          {
            ...clientCase,
            documentStatus,
            nextAction: computeNextAction({
              clientCase,
              documentStatus,
              paymentStatus: computePaymentStatus(clientCase),
              financeStatus: computeFinanceStatus(await this.listFinancialFiles()),
              certificateStatus: computeCertificateStatus(clientCase, caseDocuments),
            }),
            updatedAt: now(),
          },
          state.cases,
          (item) => item.id,
        );
      }
    }

    return updatedDocument;
  }

  async addCaseNote(caseId: string, note: string, actor: AdminActor) {
    const clientCase = await this.getCase(caseId);
    if (!clientCase) throw new Error("Client case not found.");

    return this.createEvent({
      caseId,
      uid: clientCase.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "admin_note_created",
      eventLabel: "Note interne ajoutée",
      eventPayload: { note },
    });
  }

  async linkFinancialSimulation(
    caseId: string,
    input: Partial<ClientFinancialFile>,
    actor: AdminActor,
  ) {
    const clientCase = await this.getCase(caseId);
    if (!clientCase) throw new Error("Client case not found.");

    const timestamp = now();
    const existing = (await this.listFinancialFiles()).find(
      (file) =>
        file.caseId === caseId &&
        ((input.simulationId && file.simulationId === input.simulationId) ||
          (input.quoteId && file.quoteId === input.quoteId) ||
          (input.reportId && file.reportId === input.reportId)),
    );
    const financialFile: ClientFinancialFile = {
      ...existing,
      id: existing?.id ?? id("cff"),
      uid: clientCase.uid,
      caseId,
      simulationId: input.simulationId ?? existing?.simulationId ?? null,
      quoteId: input.quoteId ?? existing?.quoteId ?? null,
      reportId: input.reportId ?? existing?.reportId ?? null,
      productCode: input.productCode ?? existing?.productCode ?? null,
      region: input.region ?? existing?.region ?? null,
      xafAmount: input.xafAmount ?? existing?.xafAmount ?? null,
      option: input.option ?? existing?.option ?? null,
      riskTier: input.riskTier ?? existing?.riskTier ?? null,
      status: input.status ?? existing?.status ?? "SIMULATED",
      reportStatus: input.reportStatus ?? existing?.reportStatus,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    await upsertDoc("client_financial_files", financialFile.id, financialFile, state.financialFiles, (item) => item.id);
    const financeStatus = computeFinanceStatus([financialFile]);
    const updatedCase: ClientCase = {
      ...clientCase,
      status: statusFromFinance(financeStatus),
      financeStatus,
      nextAction:
        financeStatus === "SIMULATED"
          ? "Générer devis"
          : financeStatus === "QUOTE_GENERATED"
            ? "Générer rapport"
            : "Générer attestation",
      updatedAt: timestamp,
    };
    await upsertDoc("client_cases", caseId, updatedCase, state.cases, (item) => item.id);
    await this.createNotification({
      type: "admin_action_required",
      severity: financialFile.status === "SENT" ? "success" : "info",
      title:
        financialFile.status === "SIMULATED"
          ? "Simulation financière liée"
          : financialFile.status === "QUOTED"
            ? "Devis lié au dossier"
            : financialFile.status === "SENT"
              ? "Devis envoyé au client"
              : "Rapport préfinancement lié",
      body: `${clientCase.caseNumber} · ${financialFile.status}`,
      relatedUid: clientCase.uid,
      relatedCaseId: caseId,
    });
    await this.createEvent({
      caseId,
      uid: clientCase.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "financial_file_linked",
      eventLabel: `Finance dossier mise à jour: ${financialFile.status}`,
      eventPayload: financialFile,
    });

    return financialFile;
  }

  async listFinancialFiles() {
    return getAllDocs<ClientFinancialFile>("client_financial_files", state.financialFiles);
  }

  async listPayments() {
    return getAllDocs<Record<string, unknown>>("payments", state.payments);
  }

  async listNotifications() {
    return sortNewest(await getAllDocs<AdminNotification>("admin_notifications", state.notifications));
  }

  async markNotificationRead(notificationId: string) {
    const notification = (await this.listNotifications()).find((item) => item.id === notificationId);
    if (!notification) throw new Error("Admin notification not found.");

    const updatedNotification = { ...notification, read: true };
    await upsertDoc("admin_notifications", notificationId, updatedNotification, state.notifications, (item) => item.id);
    return updatedNotification;
  }

  async createNotification(input: Omit<AdminNotification, "id" | "createdAt" | "read">) {
    const notification: AdminNotification = {
      ...input,
      id: id("note"),
      read: false,
      createdAt: now(),
    };
    await upsertDoc("admin_notifications", notification.id, notification, state.notifications, (item) => item.id);
    return notification;
  }

  async listEvents() {
    return sortNewest(await getAllDocs<AdminCaseEvent>("admin_case_events", state.events));
  }

  async createEvent(input: Omit<AdminCaseEvent, "id" | "createdAt">) {
    const event: AdminCaseEvent = { ...input, id: id("case_evt"), createdAt: now() };
    await upsertDoc("admin_case_events", event.id, event, state.events, (item) => item.id);
    return event;
  }

  async overview(): Promise<AdminOperationsOverview> {
    const [clients, cases, documents, notifications] = await Promise.all([
      this.listClients(),
      this.listCases(),
      this.listDocuments(),
      this.listNotifications(),
    ]);
    const since = todayStart();

    return {
      newRegistrationsToday: clients.filter((client) => Date.parse(client.createdAt) >= since).length,
      newCasesToday: cases.filter((clientCase) => Date.parse(clientCase.createdAt) >= since).length,
      documentsAwaitingReview: documents.filter((document) => document.verificationStatus === "PENDING").length,
      paymentsPending: cases.filter((clientCase) => clientCase.paymentStatus === "PENDING").length,
      paymentsConfirmed: cases.filter((clientCase) => clientCase.paymentStatus === "CONFIRMED").length,
      certificatesGenerated: cases.filter((clientCase) => clientCase.certificateStatus === "GENERATED").length,
      casesBlocked: cases.filter((clientCase) => clientCase.status === "BLOCKED").length,
      clientsTotal: clients.length,
      casesTotal: cases.length,
      unreadNotifications: notifications.filter((notification) => !notification.read).length,
    };
  }

  async syncAuthUsers(actor: AdminActor) {
    if (actor.role !== "super_admin") {
      throw new Error("Super admin role required to sync Firebase Auth users.");
    }

    assertLocalFallbackAllowed();

    if (!hasFirebaseAdminEnv()) {
      const demoClient = normalizeClient(
        {
          email: "operations.local@avicertify.local",
          fullName: "Utilisateur local de test",
          accountStatus: "ACTIVE",
        },
        "local-auth-user",
      );
      await upsertDoc("admin_client_profiles", demoClient.uid, demoClient, state.clients, (item) => item.uid);
      return { synced: 1, created: 1, updated: 0 };
    }

    const existingClients = await this.listClients();
    const existingByUid = new Map(existingClients.map((client) => [client.uid, client]));
    let pageToken: string | undefined;
    let synced = 0;
    let created = 0;
    let updated = 0;

    do {
      const page = await getAdminAuth().listUsers(1000, pageToken);
      for (const user of page.users) {
        const authProfile = mapAuthUser(user);
        const existing = existingByUid.get(user.uid);
        const merged: AdminClientProfile = {
          ...authProfile,
          ...existing,
          email: existing?.email ?? authProfile.email,
          fullName: existing?.fullName ?? authProfile.fullName,
          phone: existing?.phone ?? authProfile.phone,
          accountStatus: authProfile.accountStatus,
          lastLoginAt: authProfile.lastLoginAt,
          source: existing?.source ?? "firebase_auth_sync",
          updatedAt: now(),
        };

        await upsertDoc("admin_client_profiles", merged.uid, merged, state.clients, (item) => item.uid);

        if (existing) {
          updated += 1;
        } else {
          created += 1;
          await this.createNotification({
            type: "new_user_registered",
            severity: "info",
            title: "Nouvel utilisateur Firebase détecté",
            body: `${merged.email ?? merged.uid} a été ajouté au cockpit opérations.`,
            relatedUid: merged.uid,
            relatedCaseId: null,
          });
        }
        synced += 1;
      }
      pageToken = page.pageToken;
    } while (pageToken);

    await this.createEvent({
      caseId: null,
      uid: null,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "auth_users_synced",
      eventLabel: "Synchronisation Firebase Auth exécutée",
      eventPayload: { synced, created, updated },
    });

    return { synced, created, updated };
  }

  async reconcile(actor: AdminActor) {
    const authSync = await this.syncAuthUsers(actor);
    const result = await this.reconcileCases(actor);
    return { authSync, casesCreated: result.casesCreated };
  }

  async reconcileCases(actor: AdminActor) {
    const clients = await this.listClients();
    const documents = await this.listDocuments();
    const financialFiles = await this.listFinancialFiles();
    const payments = await this.listPayments();
    const existingCases = await this.listCases();
    let casesCreated = 0;
    let casesUpdated = 0;
    let documentsLinked = 0;
    let simulationsLinked = 0;
    let notificationsCreated = 0;

    for (const client of clients) {
      const existingCase = existingCases.find((clientCase) => clientCase.uid === client.uid) ?? null;
      const clientPayments = payments.filter((payment) => paymentBelongsToClient(payment, client));

      if (
        !hasCaseMaterializationSignal({
          client,
          existingCase,
          documents,
          financialFiles,
          payments: clientPayments,
        })
      ) {
        continue;
      }

      const result = await this.upsertDefaultCase(client, actor);
      const clientCase = result.case;
      if (result.created) {
        casesCreated += 1;
        notificationsCreated += 1;
      }

      const caseDocuments = documents.filter((document) => document.uid === client.uid);
      const caseFinancialFiles = financialFiles.filter((file) => file.uid === client.uid);
      const documentStatus = computeDocumentStatus(caseDocuments);
      const paymentStatus = mapPaymentSignalStatus(clientPayments) ?? computePaymentStatus(clientCase);
      const financeStatus = computeFinanceStatus(caseFinancialFiles);
      const certificateStatus = computeCertificateStatus(clientCase, caseDocuments);
      const updatedCase: ClientCase = {
        ...clientCase,
        clientEmail: clientCase.clientEmail ?? client.email,
        clientName: clientCase.clientName ?? client.fullName ?? client.email?.split("@")[0] ?? null,
        priority: clientCase.priority ?? client.priority,
        destinationSchool: clientCase.destinationSchool ?? clientCase.schoolName ?? null,
        paymentStatus,
        documentStatus,
        financeStatus,
        certificateStatus,
        nextAction: computeNextAction({
          clientCase,
          documentStatus,
          paymentStatus,
          financeStatus,
          certificateStatus,
        }),
        assignedAdminId: clientCase.assignedAdminId ?? client.assignedAdminId,
        updatedAt: now(),
      };
      await upsertDoc("client_cases", updatedCase.id, updatedCase, state.cases, (item) => item.id);
      casesUpdated += 1;

      for (const document of caseDocuments.filter((item) => !item.caseId)) {
        const linkedDocument: ClientDocument = { ...document, caseId: updatedCase.id };
        await upsertDoc("client_documents", linkedDocument.id, linkedDocument, state.documents, (item) => item.id);
        documentsLinked += 1;
      }
      simulationsLinked += caseFinancialFiles.filter((file) => file.caseId === updatedCase.id).length;
    }

    await this.createNotification({
      type: "admin_action_required",
      severity: "success",
      title: "Réconciliation dossiers terminée",
      body: `${casesCreated} dossiers opérationnels créés, ${casesUpdated} dossiers contrôlés.`,
      relatedUid: null,
      relatedCaseId: null,
    });
    notificationsCreated += 1;
    await this.createEvent({
      caseId: null,
      uid: null,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "cases_reconciled",
      eventLabel: "Réconciliation dossiers exécutée",
      eventPayload: { usersScanned: clients.length, casesCreated, casesUpdated, documentsLinked, simulationsLinked, notificationsCreated },
    });

    return {
      usersScanned: clients.length,
      casesCreated,
      casesUpdated,
      documentsLinked,
      paymentsLinked: 0,
      simulationsLinked,
      certificatesLinked: 0,
      notificationsCreated,
      warnings: [] as string[],
      checked: clients.length,
      created: casesCreated,
    };
  }

  async requestDocument(
    caseId: string,
    input: { documentType: string; message?: string },
    actor: AdminActor,
  ) {
    const clientCase = await this.getCase(caseId);
    if (!clientCase) throw new Error("Client case not found.");

    if (!documentTypeValues.includes(input.documentType as never)) {
      throw new Error("Invalid document request type.");
    }

    const message = input.message?.trim() || undefined;
    if (message && message.length > 2_000) {
      throw new Error("Document request message is too long.");
    }

    const client = (await this.listClients()).find(
      (item) => item.uid === clientCase.uid,
    );
    const recipientEmail = clientCase.clientEmail ?? client?.email ?? null;
    const clientName =
      clientCase.clientName ??
      client?.fullName ??
      recipientEmail?.split("@")[0] ??
      null;
    const documentLabel =
      documentTypeLabels[
        input.documentType as keyof typeof documentTypeLabels
      ];
    const existingRequest = (await this.listCaseDocuments(caseId)).find(
      (document) =>
        document.documentType === input.documentType &&
        document.verificationStatus === "REQUESTED" &&
        !document.storagePath,
    );
    const requestedAt = now();
    let document: ClientDocument = {
      id: existingRequest?.id ?? id("req"),
      uid: clientCase.uid,
      caseId,
      clientEmail: recipientEmail,
      clientName,
      documentType: input.documentType,
      fileName: documentLabel,
      storagePath: "",
      mimeType: null,
      size: null,
      downloadUrl: null,
      uploadStatus: "requested",
      uploadedBy: "SYSTEM",
      source: "SYSTEM",
      verificationStatus: "REQUESTED",
      rejectionReason: message ?? null,
      requestedAt,
      uploadedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      isRequired: true,
      deliveryStatus: "QUEUED",
    };

    await upsertDoc(
      "client_documents",
      document.id,
      document,
      state.documents,
      (item) => item.id,
    );
    await this.mirrorClientDocumentMetadata(document, "requested");

    const dashboardUrl = `${
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://www.avicertify.fr"
    }/dossier/documents`;
    const emailResult = await sendDocumentRequestEmail({
      recipientEmail,
      clientName,
      caseNumber: clientCase.caseNumber,
      documentLabels: [documentLabel],
      message,
      dashboardUrl,
      supportEmail: "contact@avicertify.com",
    });

    document = {
      ...document,
      deliveryStatus: emailResult.sent ? "SENT" : "FAILED",
    };
    await upsertDoc(
      "client_documents",
      document.id,
      document,
      state.documents,
      (item) => item.id,
    );
    await this.mirrorClientDocumentMetadata(document, "requested");

    const communication = await this.createCommunicationLog({
      caseId,
      uid: clientCase.uid,
      type: "DOCUMENT_REQUEST",
      template: "document-request",
      recipient: recipientEmail,
      status: emailResult.sent
        ? "SENT"
        : emailResult.status === "SEND_FAILED"
          ? "FAILED"
          : "NOT_SENT",
      provider: emailResult.provider,
      messageId: emailResult.messageId,
      subject: "Documents requis — AVI CERTIFY",
      body: message ?? `Document demandé: ${documentLabel}`,
    });
    const notification = await this.createNotification({
      type: "admin_action_required",
      severity: emailResult.sent ? "info" : "warning",
      title: "Demande documentaire créée",
      body: emailResult.sent
        ? `${documentLabel} demandé à ${clientName ?? "un client"}.`
        : `${documentLabel} enregistré, email non envoyé (${emailResult.status}).`,
      relatedUid: clientCase.uid,
      relatedCaseId: caseId,
    });
    const event = await this.createEvent({
      caseId,
      uid: clientCase.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "document_requested",
      eventLabel: `Document demandé: ${documentLabel}`,
      eventPayload: {
        documentId: document.id,
        documentType: input.documentType,
        deliveryStatus: emailResult.status,
        messageId: emailResult.messageId,
      },
    });

    const shouldReturnToDocuments =
      clientCase.status === "NEW" ||
      clientCase.status === "PROFILE_INCOMPLETE" ||
      clientCase.status === "DOCUMENTS_PENDING" ||
      clientCase.status === "DOCUMENTS_SUBMITTED" ||
      clientCase.status === "UNDER_REVIEW";
    const updatedCase: ClientCase = {
      ...clientCase,
      status: shouldReturnToDocuments
        ? "DOCUMENTS_PENDING"
        : clientCase.status,
      documentStatus: "MISSING",
      nextAction: `Déposer ${documentLabel}`,
      updatedAt: now(),
    };
    await upsertDoc(
      "client_cases",
      caseId,
      updatedCase,
      state.cases,
      (item) => item.id,
    );

    return {
      document,
      communication,
      notification,
      event,
      case: updatedCase,
      email: emailResult,
    };
  }

  async createCaseNotification(
    caseId: string,
    input: { channel: "internal" | "email" | "whatsapp_later"; title: string; body: string },
    actor: AdminActor,
  ) {
    const clientCase = await this.getCase(caseId);
    if (!clientCase) throw new Error("Client case not found.");

    const notification = await this.createNotification({
      type: "admin_action_required",
      severity: input.channel === "email" ? "warning" : "info",
      title: input.title,
      body:
        input.channel === "email"
          ? `${input.body} (Email à connecter via workflow Resend.)`
          : input.body,
      relatedUid: clientCase.uid,
      relatedCaseId: caseId,
    });
    const event = await this.createEvent({
      caseId,
      uid: clientCase.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "case_notification_created",
      eventLabel: `Notification ${input.channel} créée`,
      eventPayload: { channel: input.channel, title: input.title },
    });

    return { notification, event };
  }

  async createCaseReportDraft(
    caseId: string,
    input: Partial<ClientFinancialFile>,
    actor: AdminActor,
  ) {
    const financialFile = await this.linkFinancialSimulation(
      caseId,
      {
        ...input,
        reportId: input.reportId ?? id("report_draft"),
        status: "REPORTED",
        reportStatus: "PENDING_GENERATION",
      },
      actor,
    );
    const event = await this.createEvent({
      caseId,
      uid: financialFile.uid,
      actorType: "admin",
      actorId: actor.uid,
      actorRole: actor.role,
      eventType: "prefinancing_report_draft_created",
      eventLabel: "Rapport préfinancement en attente de génération PDF",
      eventPayload: financialFile,
    });

    return { report: financialFile, event };
  }
}

const adminOperationsStore = new AdminOperationsStore();

export function getAdminOperationsStore() {
  return adminOperationsStore;
}
