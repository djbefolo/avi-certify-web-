import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  generateHousingCertificatePdf,
  getDefaultCertificateDates,
} from "@/lib/certificates/certificate-generator";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { selectHousingAddress } from "@/lib/housing/housing-regions";
import { sendCertificateAvailableEmail } from "@/lib/server/email.service";
import type { PaymentServiceType } from "@/types/payment";

const CERTIFICATES_COLLECTION = "certificates";
const DOCUMENTS_COLLECTION = "documents";
const CLIENT_DOCUMENTS_URL = "https://avi-certify-web.vercel.app/dossier/documents";
const TARGET_SERVICE_TYPES: PaymentServiceType[] = ["accommodation_certificate"];

type GenerateCertificateParams = {
  ownerId: string;
  paymentId: string;
  serviceType: string | null;
  housingRegion?: string | null;
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
  certificateRef: FirebaseFirestore.DocumentReference;
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

function isTargetService(serviceType: string | null): serviceType is PaymentServiceType {
  return TARGET_SERVICE_TYPES.includes(serviceType as PaymentServiceType);
}

function buildCertificateNumber(paymentId: string) {
  const year = new Date().getFullYear();
  const suffix = paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

  return `AVI-HBG-${year}-${suffix}`;
}

function buildToken(ownerId: string, paymentId: string) {
  const secret =
    process.env.FIREBASE_PRIVATE_KEY ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "avi-certify-certificate-token";

  return crypto
    .createHmac("sha256", secret)
    .update(`${ownerId}:${paymentId}:housing_accommodation`)
    .digest("hex");
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

async function getUserProfile(ownerId: string): Promise<UserProfileData> {
  const db = getAdminFirestore();
  const [profileSnapshot, userRecord] = await Promise.all([
    db.collection("users").doc(ownerId).get(),
    getAdminAuth().getUser(ownerId).catch(() => null),
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() : null;
  const fullName =
    getStringField(profile?.fullName) ??
    getStringField(userRecord?.displayName) ??
    getStringField(userRecord?.email) ??
    "Étudiant AVI CERTIFY";

  return {
    fullName,
    email: getStringField(profile?.email) ?? getStringField(userRecord?.email),
    dateOfBirth: getStringField(profile?.dateOfBirth),
    birthPlace:
      getStringField(profile?.placeOfBirth) ?? getStringField(profile?.birthPlace),
    nationality: getStringField(profile?.nationality),
    intendedArrivalDate: getStringField(profile?.intendedArrivalDate),
    expectedStayDuration: getStringField(profile?.expectedStayDuration),
    preferredHousingCity: getStringField(profile?.preferredHousingCity),
    destinationCity: getStringField(profile?.destinationCity),
    targetSchoolName: getStringField(profile?.targetSchoolName),
    selectedService: getStringField(profile?.selectedService),
  };
}

function getMissingHousingCertificateFields(profile: UserProfileData) {
  const missingFields: string[] = [];

  if (!profile.fullName || profile.fullName === "Étudiant AVI CERTIFY") {
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
}: CertificateEmailParams) {
  if (!recipientEmail) {
    console.info("[certificates] Certificate email skipped: missing recipient.", {
      certificateId: certificateRef.id,
    });
    return false;
  }

  const snapshot = await certificateRef.get();

  if (snapshot.get("certificateEmailSent") === true) {
    return false;
  }

  const sent = await sendCertificateAvailableEmail({
    recipientEmail,
    studentFullName,
    clientSpaceUrl: CLIENT_DOCUMENTS_URL,
    verificationUrl,
  });

  if (!sent) {
    console.warn("[certificates] Certificate email was not sent.", {
      certificateId: certificateRef.id,
      recipientEmail,
    });
    return false;
  }

  try {
    await certificateRef.update({
      certificateEmailSent: true,
      certificateEmailSentAt: FieldValue.serverTimestamp(),
      certificateEmailRecipient: recipientEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn("[certificates] Certificate email sent but metadata update failed.", {
      certificateId: certificateRef.id,
      recipientEmail,
      error,
    });
  }

  return true;
}

export async function generateHousingCertificateForPaidPayment({
  ownerId,
  paymentId,
  serviceType,
  housingRegion,
}: GenerateCertificateParams) {
  if (!isTargetService(serviceType)) {
    return { generated: false, reason: "service_not_eligible" };
  }

  const db = getAdminFirestore();
  const certificateRef = db.collection(CERTIFICATES_COLLECTION).doc(paymentId);
  const existingCertificate = await certificateRef.get();
  const profile = await getUserProfile(ownerId);

  if (existingCertificate.exists && existingCertificate.get("status") === "generated") {
    if (existingCertificate.get("certificateEmailSent") !== true) {
      await sendCertificateEmailIfNeeded({
        certificateRef,
        studentFullName:
          getStringField(existingCertificate.get("studentFullName")) ??
          profile.fullName,
        recipientEmail: profile.email,
        verificationUrl: getStringField(existingCertificate.get("verificationUrl")),
      });
    }

    return { generated: false, reason: "certificate_already_exists" };
  }

  const missingProfileFields = getMissingHousingCertificateFields(profile);

  if (missingProfileFields.length > 0) {
    const now = FieldValue.serverTimestamp();

    await certificateRef.set(
      {
        ownerId,
        paymentId,
        certificateType: "housing_accommodation",
        status: "pending_profile",
        missingProfileFields,
        generationBlockedReason:
          "Votre attestation ne peut pas encore être générée. Veuillez compléter les informations obligatoires de votre profil.",
        createdAt: existingCertificate.exists
          ? existingCertificate.get("createdAt") ?? now
          : now,
        updatedAt: now,
      },
      { merge: true },
    );

    return { generated: false, reason: "missing_profile_data" };
  }

  const housing = selectHousingAddress({
    region: housingRegion,
    city: profile.preferredHousingCity ?? profile.destinationCity,
    seed: `${ownerId}:${paymentId}`,
  });
  const verificationToken = buildToken(ownerId, paymentId);
  const verificationUrl = `${getAppUrl()}/verifier/${verificationToken}`;
  const certificateNumber = buildCertificateNumber(paymentId);
  const { issueDate, entryDate: defaultEntryDate } = getDefaultCertificateDates();
  const entryDate = formatProfileDate(profile.intendedArrivalDate) ?? defaultEntryDate;
  const durationMonths = getDurationMonths(profile.expectedStayDuration) ?? 12;
  const storagePath = `users/${ownerId}/documents/${paymentId}-attestation-hebergement.pdf`;
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
        paymentId,
        certificateType: "housing_accommodation",
      },
    },
  });

  const now = FieldValue.serverTimestamp();
  const certificateData = {
    ownerId,
    paymentId,
    certificateType: "housing_accommodation",
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
    status: "generated",
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (existingCertificate.exists) {
      await certificateRef.set(certificateData, { merge: true });
    } else {
      await certificateRef.create(certificateData);
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 6
    ) {
      return { generated: false, reason: "certificate_already_exists" };
    }

    throw error;
  }

  await db.collection(DOCUMENTS_COLLECTION).doc(paymentId).set(
    {
      ownerId,
      documentType: "accommodation_certificate",
      status: "generated",
      originalFileName: "attestation-hebergement-avi-certify.pdf",
      safeFileName: "attestation-hebergement-avi-certify.pdf",
      contentType: "application/pdf",
      size: pdfBuffer.byteLength,
      storagePath,
      certificateId: paymentId,
      certificateNumber,
      verificationUrl,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  await sendCertificateEmailIfNeeded({
    certificateRef,
    studentFullName: profile.fullName,
    recipientEmail: profile.email,
    verificationUrl,
  });

  return { generated: true, certificateId: paymentId };
}

export async function getCertificateVerificationByToken(token: string) {
  const snapshot = await getAdminFirestore()
    .collection(CERTIFICATES_COLLECTION)
    .where("verificationToken", "==", token)
    .limit(1)
    .get();
  const [certificate] = snapshot.docs;

  if (!certificate) {
    return null;
  }

  return {
    id: certificate.id,
    data: certificate.data(),
  };
}
