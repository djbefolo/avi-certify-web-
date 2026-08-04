import crypto from "node:crypto";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import {
  generateHousingCertificatePdf,
  getDefaultCertificateDates,
} from "@/lib/certificates/certificate-generator";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import {
  getHousingRequestById,
  getHousingRequestForCase,
  routeHousingGenerationFailureToAdminReview,
} from "@/lib/housing/housing-request.service";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import {
  sendCertificateAvailableEmailWithResult,
  type SendEmailResult,
} from "@/lib/server/email.service";
import type { ClientCase } from "@/types/admin-ops";
import { paymentServiceConfigs } from "@/constants/payments";

const CERTIFICATES_COLLECTION = "certificates";
const DOCUMENTS_COLLECTION = "documents";
const OPERATIONS_DOCUMENTS_COLLECTION = "client_documents";
const CASES_COLLECTION = "client_cases";
const CERTIFICATE_DOCUMENT_TYPE = "accommodation_certificate";
const CERTIFICATE_TYPE = "housing_accommodation";
const FALLBACK_STUDENT_NAME = "Etudiant AVI CERTIFY";
const JOBS_COLLECTION = "document_generation_jobs";
const HOUSING_REQUESTS_COLLECTION = "housing_requests";
const DOCUMENT_VERSIONS_COLLECTION = "document_versions";
const TEMPLATE_VERSION = "housing-conditional-v1";

export type CertificateStatus =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "REPLACED"
  | "DRAFT"
  | "PENDING_PROFILE";

export type PublicCertificateVerification = {
  id: string;
  reference: string;
  status: CertificateStatus;
  valid: boolean;
  validityStatus: CertificateStatus;
  documentType: "accommodation_certificate";
  certificateType: "housing_accommodation";
  studentFullName: string | null;
  issueDate: string | null;
  validUntil: string | null;
  city: string | null;
  issuer: "AVI CERTIFY";
};

export type GenerateCaseCertificateResult = {
  generated: boolean;
  certificateId: string;
  certificateNumber: string | null;
  verificationUrl: string | null;
  reason?:
    | "certificate_already_exists"
    | "missing_profile_data"
    | "payment_not_confirmed"
    | "housing_address_unavailable"
    | "housing_request_missing"
    | "allocation_not_confirmed";
  message: string;
  missingProfileFields?: string[];
  missingFieldLabels?: string[];
  email: SendEmailResult;
};

type UserProfileData = {
  fullName: string;
  email: string | null;
  dateOfBirth: string | null;
  birthPlace: string | null;
  nationality: string | null;
  intendedArrivalDate: string | null;
  expectedStayDuration: string | null;
  preferredHousingCity: string | null;
  destinationCity: string | null;
  targetSchoolName: string | null;
  selectedService: string | null;
};

type CertificateEmailParams = {
  certificateRef: DocumentReference;
  studentFullName: string;
  recipientEmail: string | null;
  verificationUrl: string | null;
  certificateReference?: string | null;
  city?: string | null;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function getClientDocumentsUrl() {
  return `${getAppUrl()}/dossier/documents`;
}

function emptyEmailResult(status: SendEmailResult["status"]): SendEmailResult {
  return {
    sent: false,
    messageId: null,
    status,
    provider: "resend",
  };
}

function getStringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatProfileDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
  }).format(date);
}

function getDurationMonths(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/\d+/);
  const months = match ? Number(match[0]) : Number(value);

  return Number.isFinite(months) && months > 0 ? months : null;
}

function buildCertificateId(caseId: string) {
  const safeCaseId = caseId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
  const seed = safeCaseId || crypto.randomUUID().replace(/-/g, "");

  return `${seed}-housing-certificate`;
}

function buildCertificateNumber(seed: string) {
  const year = new Date().getFullYear();
  const suffix = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

  return `AVI-HBG-${year}-${suffix || crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function buildVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function isProfileNameUsable(fullName: string | null) {
  return Boolean(
    fullName &&
      fullName !== FALLBACK_STUDENT_NAME &&
      !fullName.includes("@") &&
      fullName.replace(/\s+/g, " ").trim().length >= 3,
  );
}

const missingProfileFieldLabels: Record<string, string> = {
  fullName: "nom complet",
  dateOfBirth: "date de naissance",
  placeOfBirth: "lieu de naissance",
  nationality: "nationalite",
  intendedArrivalDate: "date d'arrivee",
  expectedStayDuration: "duree de sejour",
  preferredHousingCity: "ville ou adresse d'hebergement",
};

function getMissingFieldLabels(fields: string[]) {
  return fields.map((field) => missingProfileFieldLabels[field] ?? field);
}

function buildBlockedMessage({
  reason,
  missingProfileFields = [],
}: {
  reason: NonNullable<GenerateCaseCertificateResult["reason"]>;
  missingProfileFields?: string[];
}) {
  if (reason === "payment_not_confirmed") {
    return "Generation bloquee : le paiement du dossier n'est pas confirme.";
  }

  if (reason === "housing_address_unavailable") {
    return "Generation bloquee : aucune adresse d'hebergement disponible pour ce dossier.";
  }

  if (reason === "housing_request_missing") {
    return "Generation bloquee : la demande logement est introuvable ou incoherente.";
  }

  if (reason === "allocation_not_confirmed") {
    return "Generation bloquee : une confirmation partenaire datee est obligatoire avant emission.";
  }

  if (reason === "missing_profile_data") {
    const labels = getMissingFieldLabels(missingProfileFields);

    return labels.length
      ? `Generation bloquee : profil incomplet (${labels.join(", ")}).`
      : "Generation bloquee : profil incomplet.";
  }

  return "Attestation deja disponible pour ce dossier.";
}

function isPaymentConfirmed(clientCase: ClientCase) {
  return (
    clientCase.paymentStatus === "CONFIRMED" ||
    clientCase.status === "PAYMENT_CONFIRMED" ||
    clientCase.status === "CERTIFICATE_GENERATED" ||
    clientCase.certificateStatus === "GENERATED" ||
    clientCase.certificateStatus === "SENT" ||
    clientCase.certificateStatus === "VERIFIED"
  );
}

async function hasVerifiedHousingPayment({
  paymentId,
  ownerId,
  housingRequestId,
}: {
  paymentId: string | null;
  ownerId: string;
  housingRequestId: string;
}) {
  if (!paymentId) return false;

  const payment = await getAdminFirestore()
    .collection("payments")
    .doc(paymentId)
    .get();
  const serviceConfig = paymentServiceConfigs.accommodation_certificate;

  return Boolean(
    payment.exists &&
      payment.get("status") === "paid" &&
      payment.get("ownerId") === ownerId &&
      payment.get("housingRequestId") === housingRequestId &&
      payment.get("serviceType") === "accommodation_certificate" &&
      Number(payment.get("amountTotal") ?? payment.get("amount")) ===
        serviceConfig.amount &&
      String(payment.get("currency") ?? "").toLowerCase() ===
        serviceConfig.currency.toLowerCase(),
  );
}

function normalizeCertificateStatus(value: unknown): CertificateStatus {
  if (value === "ACTIVE" || value === "generated") return "ACTIVE";
  if (value === "REVOKED" || value === "revoked") return "REVOKED";
  if (value === "EXPIRED" || value === "expired") return "EXPIRED";
  if (value === "REPLACED" || value === "replaced") return "REPLACED";
  if (value === "DRAFT" || value === "draft") return "DRAFT";
  return "PENDING_PROFILE";
}

function dateToIso(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }

  return null;
}

async function getUserProfile(
  ownerId: string,
  clientCase: ClientCase,
): Promise<UserProfileData> {
  const db = getAdminFirestore();
  const [profileSnapshot, userRecord] = await Promise.all([
    db.collection("users").doc(ownerId).get(),
    getAdminAuth().getUser(ownerId).catch(() => null),
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  const fullName =
    getStringField(profile?.fullName) ??
    getStringField(userRecord?.displayName) ??
    getStringField(clientCase.clientName) ??
    FALLBACK_STUDENT_NAME;

  return {
    fullName,
    email:
      getStringField(profile?.email) ??
      getStringField(clientCase.clientEmail) ??
      getStringField(userRecord?.email),
    dateOfBirth: getStringField(profile?.dateOfBirth),
    birthPlace:
      getStringField(profile?.placeOfBirth) ?? getStringField(profile?.birthPlace),
    nationality: getStringField(profile?.nationality),
    intendedArrivalDate: getStringField(profile?.intendedArrivalDate),
    expectedStayDuration: getStringField(profile?.expectedStayDuration),
    preferredHousingCity: getStringField(profile?.preferredHousingCity),
    destinationCity: getStringField(profile?.destinationCity),
    targetSchoolName:
      getStringField(profile?.targetSchoolName) ??
      getStringField(clientCase.destinationSchool) ??
      getStringField(clientCase.schoolName),
    selectedService:
      getStringField(profile?.selectedService) ??
      getStringField(clientCase.productType),
  };
}

function getMissingHousingCertificateFields(profile: UserProfileData) {
  const missingFields: string[] = [];

  if (!isProfileNameUsable(profile.fullName)) {
    missingFields.push("fullName");
  }

  if (!profile.dateOfBirth) {
    missingFields.push("dateOfBirth");
  }

  if (!profile.birthPlace) {
    missingFields.push("placeOfBirth");
  }

  if (!profile.nationality) {
    missingFields.push("nationality");
  }

  if (!profile.intendedArrivalDate) {
    missingFields.push("intendedArrivalDate");
  }

  if (!getDurationMonths(profile.expectedStayDuration)) {
    missingFields.push("expectedStayDuration");
  }

  if (!profile.preferredHousingCity && !profile.destinationCity) {
    missingFields.push("preferredHousingCity");
  }

  return missingFields;
}

async function sendCertificateEmailIfNeeded({
  certificateRef,
  studentFullName,
  recipientEmail,
  verificationUrl,
  certificateReference,
  city,
}: CertificateEmailParams): Promise<SendEmailResult> {
  if (!recipientEmail) {
    return emptyEmailResult("RECIPIENT_MISSING");
  }

  const snapshot = await certificateRef.get();

  if (snapshot.get("certificateEmailSent") === true) {
    return {
      sent: false,
      messageId: getStringField(snapshot.get("certificateEmailMessageId")),
      status: "SENT",
      provider: "resend",
    };
  }

  const result = await sendCertificateAvailableEmailWithResult({
    recipientEmail,
    studentFullName,
    clientSpaceUrl: getClientDocumentsUrl(),
    verificationUrl,
    certificateReference,
    city,
  });

  if (!result.sent) {
    return result;
  }

  await certificateRef.update({
    certificateEmailSent: true,
    certificateEmailSentAt: FieldValue.serverTimestamp(),
    certificateEmailRecipient: recipientEmail,
    certificateEmailMessageId: result.messageId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return result;
}

async function writeCertificateAudit({
  caseId,
  clientCase,
  actor,
  certificateId,
  certificateNumber,
  email,
}: {
  caseId: string;
  clientCase: ClientCase;
  actor: AdminActor;
  certificateId: string;
  certificateNumber: string | null;
  email: SendEmailResult;
}) {
  const store = getAdminOperationsStore();

  await store.createCommunicationLog({
    caseId,
    uid: clientCase.uid,
    type: "EMAIL",
    template: "certificate-available",
    recipient: clientCase.clientEmail ?? null,
    status: email.sent
      ? "SENT"
      : email.status === "SEND_FAILED"
        ? "FAILED"
        : "NOT_SENT",
    provider: email.provider,
    messageId: email.messageId,
    subject: "Attestation AVI CERTIFY disponible",
    body: `Attestation ${certificateNumber ?? certificateId} disponible.`,
  });

  await store.createNotification({
    type: "certificate_generated",
    severity: email.sent ? "success" : "warning",
    title: "Attestation generee",
    body: email.sent
      ? `${clientCase.caseNumber} : attestation generee et email envoye.`
      : `${clientCase.caseNumber} : attestation generee, email non envoye (${email.status}).`,
    relatedUid: clientCase.uid,
    relatedCaseId: caseId,
  });

  await store.createEvent({
    caseId,
    uid: clientCase.uid,
    actorType: "admin",
    actorId: actor.uid,
    actorRole: actor.role,
    eventType: "certificate_generated",
    eventLabel: "Attestation d'hebergement generee",
    eventPayload: {
      certificateId,
      certificateNumber,
      emailStatus: email.status,
      emailMessageId: email.messageId,
    },
  });
}

async function writeBlockedAudit({
  caseId,
  clientCase,
  actor,
  certificateId,
  reason,
  message,
  missingProfileFields,
}: {
  caseId: string;
  clientCase: ClientCase;
  actor: AdminActor;
  certificateId: string;
  reason: Exclude<
    NonNullable<GenerateCaseCertificateResult["reason"]>,
    "certificate_already_exists"
  >;
  message: string;
  missingProfileFields?: string[];
}) {
  const store = getAdminOperationsStore();
  const missingFields = missingProfileFields ?? [];

  await store.createNotification({
    type: "admin_action_required",
    severity: "warning",
    title: "Attestation bloquee",
    body: `${clientCase.caseNumber} : ${message}`,
    relatedUid: clientCase.uid,
    relatedCaseId: caseId,
  });

  await store.createEvent({
    caseId,
    uid: clientCase.uid,
    actorType: "admin",
    actorId: actor.uid,
    actorRole: actor.role,
    eventType: "certificate_generation_blocked",
    eventLabel: "Generation attestation bloquee",
    eventPayload: {
      certificateId,
      reason,
      message,
      missingProfileFields: missingFields,
      missingFieldLabels: getMissingFieldLabels(missingFields),
    },
  });
}

export async function generateHousingCertificateForCase({
  caseId,
  actor,
  housingRequestId,
  generationJobId,
}: {
  caseId: string;
  actor: AdminActor;
  housingRegion?: string | null;
  housingRequestId?: string | null;
  generationJobId?: string | null;
}): Promise<GenerateCaseCertificateResult> {
  const store = getAdminOperationsStore();
  const clientCase = await store.getCase(caseId);

  if (!clientCase) {
    throw new Error("Client case not found.");
  }

  const ownerId = clientCase.uid;
  const db = getAdminFirestore();
  const certificateId = buildCertificateId(caseId);
  const certificateRef = db.collection(CERTIFICATES_COLLECTION).doc(certificateId);
  const existingCertificate = await certificateRef.get();
  const existingStatus = normalizeCertificateStatus(
    existingCertificate.get("status"),
  );
  let profile = await getUserProfile(ownerId, clientCase);
  const caseHousingRequestId = getStringField(
    (clientCase as ClientCase & { housingRequestId?: string | null })
      .housingRequestId,
  );
  const linkedHousingRequestId = housingRequestId ?? caseHousingRequestId;
  const housingRequest = linkedHousingRequestId
    ? await getHousingRequestById(linkedHousingRequestId)
    : await getHousingRequestForCase(caseId);

  if (linkedHousingRequestId && !housingRequest) {
    const reason = "housing_request_missing" as const;
    const message = buildBlockedMessage({ reason });
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
    });
    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  if (
    housingRequest &&
    (housingRequest.ownerId !== ownerId || housingRequest.caseId !== caseId)
  ) {
    throw new Error("HOUSING_REQUEST_CASE_MISMATCH");
  }

  if (housingRequest?.certificateSnapshot) {
    const snapshot = housingRequest.certificateSnapshot;
    profile = {
      fullName: snapshot.student.fullName,
      email: snapshot.student.email,
      dateOfBirth: snapshot.student.dateOfBirth,
      birthPlace: snapshot.student.placeOfBirth,
      nationality: snapshot.student.nationality,
      intendedArrivalDate: snapshot.student.expectedArrivalDate,
      expectedStayDuration: String(snapshot.student.expectedStayDurationMonths),
      preferredHousingCity: housingRequest.preferredCity,
      destinationCity: housingRequest.preferredCity,
      targetSchoolName: snapshot.student.schoolName,
      selectedService: housingRequest.serviceType,
    };
  }

  if (
    existingCertificate.exists &&
    existingStatus === "ACTIVE" &&
    getStringField(existingCertificate.get("storagePath"))
  ) {
    const email = await sendCertificateEmailIfNeeded({
      certificateRef,
      studentFullName:
        getStringField(existingCertificate.get("studentFullName")) ??
        profile.fullName,
      recipientEmail: profile.email,
      verificationUrl: getStringField(existingCertificate.get("verificationUrl")),
      certificateReference: getStringField(
        existingCertificate.get("certificateNumber"),
      ),
      city: getStringField(existingCertificate.get("city")),
    });

    return {
      generated: false,
      reason: "certificate_already_exists",
      certificateId,
      certificateNumber: getStringField(existingCertificate.get("certificateNumber")),
      verificationUrl: getStringField(existingCertificate.get("verificationUrl")),
      message: buildBlockedMessage({ reason: "certificate_already_exists" }),
      email,
    };
  }

  if (!isPaymentConfirmed(clientCase)) {
    const reason = "payment_not_confirmed" as const;
    const message = buildBlockedMessage({ reason });

    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "DRAFT",
        blockedReason: reason,
        generationBlockedReason: message,
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
    });

    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  if (!housingRequest) {
    const reason = "housing_request_missing" as const;
    const message = buildBlockedMessage({ reason });
    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "DRAFT",
        blockedReason: reason,
        generationBlockedReason: message,
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
    });
    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  if (
    !(await hasVerifiedHousingPayment({
      paymentId: housingRequest.paymentId,
      ownerId,
      housingRequestId: housingRequest.id,
    }))
  ) {
    const reason = "payment_not_confirmed" as const;
    const message = buildBlockedMessage({ reason });
    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        housingRequestId: housingRequest.id,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "DRAFT",
        blockedReason: reason,
        generationBlockedReason: message,
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
    });
    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  if (
    !housingRequest.certificateSnapshot ||
      !housingRequest.allocation ||
      ![
        "auto_approved_generation_queued",
        "admin_approved_generation_queued",
        "generation_processing",
        "conditionally_reserved",
        "certificate_generation_pending",
        "certificate_generated",
        "certificate_delivered",
      ].includes(housingRequest.status)
  ) {
    const reason = "allocation_not_confirmed" as const;
    const message = buildBlockedMessage({ reason });

    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        housingRequestId: housingRequest.id,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "DRAFT",
        blockedReason: reason,
        generationBlockedReason: message,
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
    });

    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  const missingProfileFields = getMissingHousingCertificateFields(profile);

  if (missingProfileFields.length > 0) {
    const reason = "missing_profile_data" as const;
    const message = buildBlockedMessage({ reason, missingProfileFields });

    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "PENDING_PROFILE",
        blockedReason: reason,
        missingProfileFields,
        missingFieldLabels: getMissingFieldLabels(missingProfileFields),
        generationBlockedReason: message,
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await writeBlockedAudit({
      caseId,
      clientCase,
      actor,
      certificateId,
      reason,
      message,
      missingProfileFields,
    });

    return {
      generated: false,
      reason,
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      message,
      missingProfileFields,
      missingFieldLabels: getMissingFieldLabels(missingProfileFields),
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  const certificateSnapshot = housingRequest.certificateSnapshot;
  const housing = {
    region: housingRequest.preferredCityCode,
    city: certificateSnapshot.housing.city,
    fullAddress: `${certificateSnapshot.housing.addressLine}, ${certificateSnapshot.housing.postalCode} ${certificateSnapshot.housing.city}`,
    rent: certificateSnapshot.housing.monthlyRent,
  };
  const certificateNumber =
    getStringField(existingCertificate.get("certificateNumber")) ??
    buildCertificateNumber(caseId);
  const verificationToken =
    getStringField(existingCertificate.get("verificationToken")) ??
    buildVerificationToken();
  const verificationUrl = `${getAppUrl()}/verifier/${verificationToken}`;
  const { issueDate, entryDate: defaultEntryDate } = getDefaultCertificateDates();
  const entryDate = formatProfileDate(profile.intendedArrivalDate) ?? defaultEntryDate;
  const durationMonths = getDurationMonths(profile.expectedStayDuration) ?? 12;
  const storagePath = `users/${ownerId}/documents/${certificateId}-attestation-hebergement.pdf`;
  const pdfBuffer = await generateHousingCertificatePdf({
    certificateNumber,
    studentFullName: profile.fullName,
    dateOfBirth: formatProfileDate(profile.dateOfBirth) ?? profile.dateOfBirth ?? "",
    birthPlace: profile.birthPlace ?? "",
    nationality: profile.nationality ?? "",
    targetSchoolName: profile.targetSchoolName,
    housing,
    entryDate,
    durationMonths,
    issueDate,
    validUntil: formatProfileDate(certificateSnapshot.housing.validUntil),
    verificationUrl,
    templateVersion: TEMPLATE_VERSION,
  });
  const checksumSha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

  await getAdminStorage().bucket().file(storagePath).save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      metadata: {
        ownerId,
        uid: ownerId,
        caseId,
        documentId: certificateId,
        certificateId,
        certificateNumber,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        certificateType: CERTIFICATE_TYPE,
        templateVersion: TEMPLATE_VERSION,
        checksumSha256,
        ...(housingRequest ? { housingRequestId: housingRequest.id } : {}),
        ...(housingRequest?.paymentId ? { paymentId: housingRequest.paymentId } : {}),
      },
    },
  });

  const firestoreNow = FieldValue.serverTimestamp();
  const isoNow = new Date().toISOString();
  const certificateData = {
    ownerId,
    uid: ownerId,
    caseId,
    certificateType: CERTIFICATE_TYPE,
    documentType: CERTIFICATE_DOCUMENT_TYPE,
    certificateNumber,
    studentFullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth,
    birthPlace: profile.birthPlace,
    nationality: profile.nationality,
    targetSchoolName: profile.targetSchoolName,
    selectedService: profile.selectedService,
    housingRegion: housing.region,
    housingAddress: housing.fullAddress,
    city: housing.city,
    rent: housing.rent,
    entryDate,
    durationMonths,
    storagePath,
    verificationToken,
    verificationUrl,
    validUntil: certificateSnapshot.housing.validUntil,
    conditionalStatus: "CONDITIONAL",
    templateVersion: TEMPLATE_VERSION,
    checksumSha256,
    version: certificateSnapshot.housing.allocationVersion,
    ...(housingRequest
      ? {
          housingRequestId: housingRequest.id,
          paymentId: housingRequest.paymentId,
          generationJobId: generationJobId ?? housingRequest.generationJobId,
          certificateSnapshot,
        }
      : {}),
    status: "ACTIVE",
    issuedAt: firestoreNow,
    createdAt: existingCertificate.exists
      ? existingCertificate.get("createdAt") ?? firestoreNow
      : firestoreNow,
    updatedAt: firestoreNow,
  };

  await certificateRef.set(certificateData, { merge: true });

  await db.collection(DOCUMENTS_COLLECTION).doc(certificateId).set(
    {
      ownerId,
      uid: ownerId,
      caseId,
      documentType: CERTIFICATE_DOCUMENT_TYPE,
      status: "generated",
      verificationStatus: "APPROVED",
      originalFileName: "attestation-hebergement-avi-certify.pdf",
      safeFileName: "attestation-hebergement-avi-certify.pdf",
      contentType: "application/pdf",
      size: pdfBuffer.byteLength,
      storagePath,
      source: "SYSTEM",
      uploadedBy: "SYSTEM",
      certificateId,
      certificateNumber,
      verificationUrl,
      paymentId: housingRequest?.paymentId ?? null,
      housingRequestId: housingRequest?.id ?? null,
      checksumSha256,
      templateVersion: TEMPLATE_VERSION,
      version: housingRequest?.allocation?.allocationVersion ?? 1,
      createdAt: firestoreNow,
      updatedAt: firestoreNow,
    },
    { merge: true },
  );

  await db.collection(OPERATIONS_DOCUMENTS_COLLECTION).doc(certificateId).set(
    {
      id: certificateId,
      uid: ownerId,
      caseId,
      clientEmail: clientCase.clientEmail ?? profile.email,
      clientName: clientCase.clientName ?? profile.fullName,
      documentType: CERTIFICATE_DOCUMENT_TYPE,
      fileName: "attestation-hebergement-avi-certify.pdf",
      storagePath,
      mimeType: "application/pdf",
      size: pdfBuffer.byteLength,
      downloadUrl: null,
      uploadStatus: "generated",
      uploadedBy: "SYSTEM",
      source: "SYSTEM",
      verificationStatus: "APPROVED",
      rejectionReason: null,
      requestedAt: null,
      uploadedAt: isoNow,
      verifiedAt: isoNow,
      verifiedBy: actor.uid,
      isRequired: false,
      deliveryStatus: null,
      paymentId: housingRequest?.paymentId ?? null,
      housingRequestId: housingRequest?.id ?? null,
      checksumSha256,
      templateVersion: TEMPLATE_VERSION,
      version: housingRequest?.allocation?.allocationVersion ?? 1,
    },
    { merge: true },
  );

  await db
    .collection(DOCUMENT_VERSIONS_COLLECTION)
    .doc(`${certificateId}_v${housingRequest?.allocation?.allocationVersion ?? 1}`)
    .set({
      certificateId,
      documentId: certificateId,
      ownerId,
      caseId,
      housingRequestId: housingRequest?.id ?? null,
      paymentId: housingRequest?.paymentId ?? null,
      version: housingRequest?.allocation?.allocationVersion ?? 1,
      templateVersion: TEMPLATE_VERSION,
      checksumSha256,
      storagePath,
      status: "ACTIVE",
      createdAt: firestoreNow,
      createdBy: actor.uid,
    });

  await db.collection(CASES_COLLECTION).doc(caseId).set(
    {
      certificateStatus: "GENERATED",
      status:
        clientCase.status === "COMPLETED" || clientCase.status === "BLOCKED"
          ? clientCase.status
          : "CERTIFICATE_GENERATED",
      nextAction:
        clientCase.status === "BLOCKED" ? clientCase.nextAction : "Dossier complet",
      updatedAt: isoNow,
    },
    { merge: true },
  );

  if (housingRequest) {
    await db.collection(HOUSING_REQUESTS_COLLECTION).doc(housingRequest.id).set(
      {
        status: "certificate_generated",
        generatedDocumentId: certificateId,
        generationJobId: generationJobId ?? housingRequest.generationJobId,
        updatedAt: isoNow,
      },
      { merge: true },
    );
  }

  if (generationJobId) {
    await db.collection(JOBS_COLLECTION).doc(generationJobId).set(
      {
        status: "succeeded",
        completedAt: isoNow,
        generatedDocumentId: certificateId,
        lastErrorCode: null,
        lastErrorMessageSanitized: null,
      },
      { merge: true },
    );
  }

  const email = await sendCertificateEmailIfNeeded({
    certificateRef,
    studentFullName: profile.fullName,
    recipientEmail: profile.email,
    verificationUrl,
    certificateReference: certificateNumber,
    city: housing.city,
  });
  await writeCertificateAudit({
    caseId,
    clientCase,
    actor,
    certificateId,
    certificateNumber,
    email,
  });

  if (housingRequest && email.sent) {
    await db.collection(HOUSING_REQUESTS_COLLECTION).doc(housingRequest.id).set(
      {
        status: "certificate_delivered",
        deliveredAt: isoNow,
        updatedAt: isoNow,
      },
      { merge: true },
    );
  }

  return {
    generated: true,
    certificateId,
    certificateNumber,
    verificationUrl,
    message: "Attestation generee.",
    email,
  };
}

export async function processHousingCertificateJob({
  housingRequestId,
  actor,
}: {
  housingRequestId: string;
  actor?: AdminActor;
}) {
  const request = await getHousingRequestById(housingRequestId);
  if (!request) throw new Error("HOUSING_REQUEST_NOT_FOUND");
  if (!request.generationJobId) throw new Error("HOUSING_GENERATION_JOB_NOT_FOUND");
  if (!request.paymentId) throw new Error("HOUSING_PAYMENT_NOT_FOUND");

  const db = getAdminFirestore();
  const jobRef = db.collection(JOBS_COLLECTION).doc(request.generationJobId);
  const [job, payment] = await Promise.all([
    jobRef.get(),
    db.collection("payments").doc(request.paymentId).get(),
  ]);
  if (!job.exists) throw new Error("HOUSING_GENERATION_JOB_NOT_FOUND");

  const serviceConfig = paymentServiceConfigs.accommodation_certificate;
  if (
    !payment.exists ||
    payment.get("status") !== "paid" ||
    payment.get("ownerId") !== request.ownerId ||
    payment.get("housingRequestId") !== request.id ||
    payment.get("serviceType") !== "accommodation_certificate" ||
    Number(payment.get("amountTotal") ?? payment.get("amount")) !==
      serviceConfig.amount ||
    String(payment.get("currency") ?? "").toLowerCase() !==
      serviceConfig.currency.toLowerCase()
  ) {
    throw new Error("HOUSING_PAYMENT_NOT_CONFIRMED");
  }

  if (!request.allocation || !request.certificateSnapshot) {
    throw new Error("HOUSING_ALLOCATION_NOT_CONFIRMED");
  }

  const generationActor: AdminActor = actor ?? {
    uid: "system:housing-policy-engine",
    role: "admin",
    authProvider: "firebase",
  };

  const startedAt = new Date().toISOString();
  await Promise.all([
    jobRef.set(
      {
        status: "processing",
        attemptCount: FieldValue.increment(1),
        startedAt,
        failedAt: null,
        lastErrorCode: null,
        lastErrorMessageSanitized: null,
      },
      { merge: true },
    ),
    db.collection(HOUSING_REQUESTS_COLLECTION).doc(request.id).set(
      { status: "generation_processing", updatedAt: startedAt },
      { merge: true },
    ),
  ]);

  try {
    const result = await generateHousingCertificateForCase({
      caseId: request.caseId,
      actor: generationActor,
      housingRequestId: request.id,
      generationJobId: request.generationJobId,
    });

    if (!result.generated && result.reason !== "certificate_already_exists") {
      await jobRef.set(
        {
          status: "retryable",
          failedAt: new Date().toISOString(),
          lastErrorCode: result.reason ?? "CERTIFICATE_GENERATION_BLOCKED",
          lastErrorMessageSanitized: result.message.slice(0, 500),
        },
        { merge: true },
      );
    } else if (!result.generated) {
      await jobRef.set(
        {
          status: "succeeded",
          completedAt: new Date().toISOString(),
          generatedDocumentId: result.certificateId,
        },
        { merge: true },
      );
    }

    return result;
  } catch (error) {
    const errorCode =
      error instanceof Error ? error.message : "CERTIFICATE_GENERATION_FAILED";
    await Promise.all([
      jobRef.set(
        {
          status: "retryable",
          failedAt: new Date().toISOString(),
          lastErrorCode: errorCode.slice(0, 120),
          lastErrorMessageSanitized: "Certificate generation requires admin retry.",
        },
        { merge: true },
      ),
      routeHousingGenerationFailureToAdminReview({ request, errorCode }),
    ]);
    throw error;
  }
}

export function toPublicCertificateVerification(
  id: string,
  data: Record<string, unknown>,
): PublicCertificateVerification {
  const storedStatus = normalizeCertificateStatus(data.status);
  const validUntil = dateToIso(data.validUntil);
  const expiredByDate = Boolean(
    validUntil && new Date(validUntil).getTime() < Date.now(),
  );
  const status =
    storedStatus === "ACTIVE" && expiredByDate ? "EXPIRED" : storedStatus;
  const valid = status === "ACTIVE";

  return {
    id,
    reference:
      getStringField(data.certificateNumber) ??
      getStringField(data.reference) ??
      id,
    status,
    valid,
    validityStatus: status,
    documentType: CERTIFICATE_DOCUMENT_TYPE,
    certificateType: CERTIFICATE_TYPE,
    studentFullName: valid ? getStringField(data.studentFullName) : null,
    issueDate: dateToIso(data.issuedAt ?? data.createdAt),
    validUntil,
    city: valid ? getStringField(data.city) : null,
    issuer: "AVI CERTIFY",
  };
}

export async function getPublicCertificateVerificationByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(token)) {
    return null;
  }

  const snapshot = await getAdminFirestore()
    .collection(CERTIFICATES_COLLECTION)
    .where("verificationToken", "==", token)
    .limit(1)
    .get();
  const [certificate] = snapshot.docs;

  if (!certificate) {
    return null;
  }

  return toPublicCertificateVerification(
    certificate.id,
    certificate.data() as Record<string, unknown>,
  );
}
