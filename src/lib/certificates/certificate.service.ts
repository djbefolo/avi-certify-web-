import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  generateHousingCertificatePdf,
  getDefaultCertificateDates,
} from "@/lib/certificates/certificate-generator";
import { getAdminAuth, getAdminFirestore, getAdminStorage } from "@/lib/firebase/admin";
import { selectHousingAddress } from "@/lib/housing/housing-regions";
import type { PaymentServiceType } from "@/types/payment";

const CERTIFICATES_COLLECTION = "certificates";
const DOCUMENTS_COLLECTION = "documents";
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
    birthPlace: getStringField(profile?.birthPlace),
  };
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

  if (existingCertificate.exists) {
    return { generated: false, reason: "certificate_already_exists" };
  }

  const profile = await getUserProfile(ownerId);
  const housing = selectHousingAddress({
    region: housingRegion,
    seed: `${ownerId}:${paymentId}`,
  });
  const verificationToken = buildToken(ownerId, paymentId);
  const verificationUrl = `${getAppUrl()}/verifier/${verificationToken}`;
  const certificateNumber = buildCertificateNumber(paymentId);
  const { issueDate, entryDate } = getDefaultCertificateDates();
  const durationMonths = 12;
  const storagePath = `users/${ownerId}/documents/${paymentId}-attestation-hebergement.pdf`;
  const pdfBuffer = await generateHousingCertificatePdf({
    certificateNumber,
    studentFullName: profile.fullName,
    dateOfBirth: profile.dateOfBirth,
    birthPlace: profile.birthPlace,
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
    ...(profile.dateOfBirth ? { dateOfBirth: profile.dateOfBirth } : {}),
    ...(profile.birthPlace ? { birthPlace: profile.birthPlace } : {}),
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
    await certificateRef.create(certificateData);
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
