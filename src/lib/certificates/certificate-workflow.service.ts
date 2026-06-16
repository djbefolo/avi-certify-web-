import crypto from "node:crypto";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import {
  generateHousingCertificatePdf,
  getDefaultCertificateDates,
} from "@/lib/certificates/certificate-generator";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { selectHousingAddress } from "@/lib/housing/housing-regions";
import type { AdminActor } from "@/lib/admin/admin-auth";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import {
  sendCertificateAvailableEmailWithResult,
  type SendEmailResult,
} from "@/lib/server/email.service";
import type { ClientCase } from "@/types/admin-ops";

const CERTIFICATES_COLLECTION = "certificates";
const DOCUMENTS_COLLECTION = "documents";
const OPERATIONS_DOCUMENTS_COLLECTION = "client_documents";
const CASES_COLLECTION = "client_cases";
const CERTIFICATE_DOCUMENT_TYPE = "accommodation_certificate";
const CERTIFICATE_TYPE = "housing_accommodation";
const FALLBACK_STUDENT_NAME = "Etudiant AVI CERTIFY";

export type CertificateStatus =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
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
  issuer: "AVI CERTIFY";
};

export type GenerateCaseCertificateResult = {
  generated: boolean;
  certificateId: string;
  certificateNumber: string | null;
  verificationUrl: string | null;
  reason?:
    | "certificate_already_exists"
    | "missing_profile_data";
  missingProfileFields?: string[];
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

function normalizeCertificateStatus(value: unknown): CertificateStatus {
  if (value === "ACTIVE" || value === "generated") return "ACTIVE";
  if (value === "REVOKED" || value === "revoked") return "REVOKED";
  if (value === "EXPIRED" || value === "expired") return "EXPIRED";
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
  missingProfileFields,
}: {
  caseId: string;
  clientCase: ClientCase;
  actor: AdminActor;
  certificateId: string;
  missingProfileFields: string[];
}) {
  const store = getAdminOperationsStore();

  await store.createNotification({
    type: "admin_action_required",
    severity: "warning",
    title: "Attestation bloquee",
    body: `${clientCase.caseNumber} : profil incomplet (${missingProfileFields.join(", ")}).`,
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
      missingProfileFields,
    },
  });
}

export async function generateHousingCertificateForCase({
  caseId,
  actor,
  housingRegion,
}: {
  caseId: string;
  actor: AdminActor;
  housingRegion?: string | null;
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
  const profile = await getUserProfile(ownerId, clientCase);

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
    });

    return {
      generated: false,
      reason: "certificate_already_exists",
      certificateId,
      certificateNumber: getStringField(existingCertificate.get("certificateNumber")),
      verificationUrl: getStringField(existingCertificate.get("verificationUrl")),
      email,
    };
  }

  const missingProfileFields = getMissingHousingCertificateFields(profile);

  if (missingProfileFields.length > 0) {
    await certificateRef.set(
      {
        ownerId,
        uid: ownerId,
        caseId,
        certificateType: CERTIFICATE_TYPE,
        documentType: CERTIFICATE_DOCUMENT_TYPE,
        status: "PENDING_PROFILE",
        missingProfileFields,
        generationBlockedReason:
          "Certificate generation is blocked until required profile fields are complete.",
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
      missingProfileFields,
    });

    return {
      generated: false,
      reason: "missing_profile_data",
      certificateId,
      certificateNumber: null,
      verificationUrl: null,
      missingProfileFields,
      email: emptyEmailResult("RECIPIENT_MISSING"),
    };
  }

  const housing = selectHousingAddress({
    region: housingRegion,
    city: profile.preferredHousingCity ?? profile.destinationCity,
    seed: `${ownerId}:${caseId}`,
  });
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
    verificationUrl,
  });

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
    },
    { merge: true },
  );

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

  const email = await sendCertificateEmailIfNeeded({
    certificateRef,
    studentFullName: profile.fullName,
    recipientEmail: profile.email,
    verificationUrl,
  });
  await writeCertificateAudit({
    caseId,
    clientCase,
    actor,
    certificateId,
    certificateNumber,
    email,
  });

  return {
    generated: true,
    certificateId,
    certificateNumber,
    verificationUrl,
    email,
  };
}

export function toPublicCertificateVerification(
  id: string,
  data: Record<string, unknown>,
): PublicCertificateVerification {
  const status = normalizeCertificateStatus(data.status);
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
