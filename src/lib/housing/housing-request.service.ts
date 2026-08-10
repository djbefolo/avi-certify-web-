import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  createHousingSelectionSnapshot,
  getHousingResidenceById,
  mapHousingInventoryItem,
} from "@/lib/housing/housing-inventory.service";
import { evaluateHousingAutoIssuance } from "@/lib/housing/housing-auto-issuance-policy.service";
import {
  resolveHousingClientPricing,
  sameHousingMoneyAmount,
} from "@/lib/housing/housing-pricing";
import {
  sendHousingAdminReviewRequiredEmail,
  sendHousingReviewRequiredEmail,
} from "@/lib/server/email.service";
import type {
  HousingAllocationInput,
  HousingRequestInput,
} from "@/lib/validations/housing";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type {
  HousingDocumentGenerationJob,
  HousingAllocation,
  HousingCertificateSnapshot,
  HousingRequest,
  HousingRequestStatus,
} from "@/types/housing";

const REQUESTS_COLLECTION = "housing_requests";
const USERS_COLLECTION = "users";
const CASES_COLLECTION = "client_cases";
const EVENTS_COLLECTION = "admin_case_events";
const NOTIFICATIONS_COLLECTION = "admin_notifications";
const JOBS_COLLECTION = "document_generation_jobs";
const PAYMENTS_COLLECTION = "payments";
const INVENTORY_COLLECTION = "housing_inventory";
const COMMUNICATIONS_COLLECTION = "communication_logs";

function now() {
  return new Date().toISOString();
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateToIso(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
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

function normalizeStatus(value: unknown): HousingRequestStatus {
  const statuses: HousingRequestStatus[] = [
    "draft",
    "awaiting_payment",
    "payment_pending",
    "payment_confirmed",
    "auto_validation_pending",
    "auto_approved_generation_queued",
    "requires_admin_review",
    "admin_review_in_progress",
    "admin_approved_generation_queued",
    "generation_processing",
    "allocation_pending",
    "conditionally_reserved",
    "certificate_generation_pending",
    "certificate_generated",
    "certificate_delivered",
    "replaced",
    "revoked",
    "expired",
    "failed",
  ];

  return statuses.includes(value as HousingRequestStatus)
    ? (value as HousingRequestStatus)
    : "draft";
}

function mapHousingRequest(
  id: string,
  data: Record<string, unknown>,
): HousingRequest {
  return {
    ...(data as unknown as HousingRequest),
    id,
    status: normalizeStatus(data.status),
    housingInventoryId: safeString(data.housingInventoryId),
    paymentId: safeString(data.paymentId),
    generationJobId: safeString(data.generationJobId),
    generatedDocumentId: safeString(data.generatedDocumentId),
    allocation:
      data.allocation && typeof data.allocation === "object"
        ? (data.allocation as HousingRequest["allocation"])
        : null,
    selectionSnapshot:
      data.selectionSnapshot && typeof data.selectionSnapshot === "object"
        ? (data.selectionSnapshot as HousingRequest["selectionSnapshot"])
        : null,
    paymentSnapshot:
      data.paymentSnapshot && typeof data.paymentSnapshot === "object"
        ? (data.paymentSnapshot as HousingRequest["paymentSnapshot"])
        : null,
    autoDecisionSnapshot:
      data.autoDecisionSnapshot && typeof data.autoDecisionSnapshot === "object"
        ? (data.autoDecisionSnapshot as HousingRequest["autoDecisionSnapshot"])
        : null,
    adminApprovalSnapshot:
      data.adminApprovalSnapshot && typeof data.adminApprovalSnapshot === "object"
        ? (data.adminApprovalSnapshot as HousingRequest["adminApprovalSnapshot"])
        : null,
    certificateSnapshot:
      data.certificateSnapshot && typeof data.certificateSnapshot === "object"
        ? (data.certificateSnapshot as HousingRequest["certificateSnapshot"])
        : null,
    duplicateOrFraudRisk: data.duplicateOrFraudRisk === true,
    createdAt: dateToIso(data.createdAt) ?? now(),
    updatedAt: dateToIso(data.updatedAt) ?? now(),
    paidAt: dateToIso(data.paidAt),
  };
}

function buildCaseNumber(seed: string) {
  const year = new Date().getUTCFullYear();
  const suffix = seed.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
  return `HOU-${year}-${suffix}`;
}

async function listOwnerRequests(ownerId: string) {
  const snapshot = await getAdminFirestore()
    .collection(REQUESTS_COLLECTION)
    .where("ownerId", "==", ownerId)
    .limit(20)
    .get();

  return snapshot.docs
    .map((document) =>
      mapHousingRequest(document.id, document.data() as Record<string, unknown>),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function findReusableRequest(ownerId: string) {
  const requests = await listOwnerRequests(ownerId);
  return (
    requests.find((request) =>
      ["draft", "awaiting_payment"].includes(request.status),
    ) ?? null
  );
}

async function findHousingCase(ownerId: string) {
  const snapshot = await getAdminFirestore()
    .collection(CASES_COLLECTION)
    .where("uid", "==", ownerId)
    .limit(20)
    .get();

  return (
    snapshot.docs.find((document) => {
      const productType = document.get("productType");
      const status = document.get("status");
      return (
        productType === "ATTESTATION_HEBERGEMENT" &&
        status !== "COMPLETED" &&
        status !== "BLOCKED"
      );
    }) ?? null
  );
}

export async function createOrUpdateHousingRequest({
  ownerId,
  accountEmail,
  input,
}: {
  ownerId: string;
  accountEmail: string;
  input: HousingRequestInput;
}) {
  const db = getAdminFirestore();
  const inventoryResult = await getHousingResidenceById(input.housingInventoryId);
  if (inventoryResult.source === "unavailable") {
    throw new Error("HOUSING_INVENTORY_UNAVAILABLE");
  }
  const inventorySource = inventoryResult.source;
  const inventory = inventoryResult.data;

  if (
    !inventory ||
    !inventory.isVisibleToClients ||
    ["unavailable", "suspended", "archived"].includes(inventory.inventoryStatus)
  ) {
    throw new Error("HOUSING_INVENTORY_NOT_SELECTABLE");
  }
  if (inventory.cityCode !== input.preferredCityCode) {
    throw new Error("HOUSING_INVENTORY_CITY_MISMATCH");
  }
  if (!inventory.accommodationTypes.includes(input.accommodationType)) {
    throw new Error("HOUSING_ACCOMMODATION_TYPE_NOT_AVAILABLE");
  }

  const [existingRequest, existingCase] = await Promise.all([
    findReusableRequest(ownerId),
    findHousingCase(ownerId),
  ]);
  const requestRef = existingRequest
    ? db.collection(REQUESTS_COLLECTION).doc(existingRequest.id)
    : db.collection(REQUESTS_COLLECTION).doc();
  const caseRef = existingCase
    ? db.collection(CASES_COLLECTION).doc(existingCase.id)
    : db.collection(CASES_COLLECTION).doc(`case_${requestRef.id}`);
  const timestamp = now();
  const fullName = `${input.studentFirstName} ${input.studentLastName}`
    .replace(/\s+/g, " ")
    .trim();
  const caseNumber = existingCase?.get("caseNumber") ?? buildCaseNumber(requestRef.id);
  const selectionSnapshot = createHousingSelectionSnapshot({
    inventory,
    inventorySource,
    accommodationType: input.accommodationType,
    selectedAt: timestamp,
  });
  const clientPricing = resolveHousingClientPricing(selectionSnapshot.pricing);
  if (!clientPricing) {
    throw new Error("HOUSING_CLIENT_RENT_MISSING");
  }
  const request: HousingRequest = {
    id: requestRef.id,
    ownerId,
    caseId: caseRef.id,
    clientEmail: accountEmail.toLowerCase(),
    clientName: fullName,
    serviceType: "conditional_housing_certificate",
    status: "awaiting_payment",
    studentFirstName: input.studentFirstName,
    studentLastName: input.studentLastName,
    studentFullName: fullName,
    studentPhone: input.studentPhone,
    studentDateOfBirth: input.studentDateOfBirth,
    studentPlaceOfBirth: input.studentPlaceOfBirth,
    nationality: input.nationality.label,
    nationalityReference: input.nationality,
    originCountry: input.originCountry.label,
    originCountryReference: input.originCountry,
    currentResidenceCountry: input.currentResidenceCountry.label,
    currentResidenceCountryReference: input.currentResidenceCountry,
    destinationCountry: "France",
    destinationCountryReference: input.destinationCountry,
    housingInventoryId: inventory.id,
    preferredCityCode: inventory.cityCode,
    preferredCity: inventory.cityLabel,
    schoolName: input.schoolName,
    schoolCity: input.schoolCity,
    academicYear: input.academicYear,
    expectedArrivalDate: input.expectedArrivalDate,
    expectedStayDurationMonths: input.expectedStayDurationMonths,
    accommodationType: input.accommodationType,
    indicativeMonthlyRent: clientPricing.clientMonthlyRent,
    currency: "EUR",
    specialNeeds: input.specialNeeds || null,
    notes: input.notes || null,
    consentAccuracy: true,
    consentConditionalNature: true,
    consentTerms: true,
    consentDataProcessing: true,
    consentAddressAdjustment: true,
    paymentId: existingRequest?.paymentId ?? null,
    allocation: existingRequest?.allocation ?? null,
    selectionSnapshot,
    paymentSnapshot: existingRequest?.paymentSnapshot ?? null,
    autoDecisionSnapshot: null,
    adminApprovalSnapshot: existingRequest?.adminApprovalSnapshot ?? null,
    certificateSnapshot: existingRequest?.certificateSnapshot ?? null,
    duplicateOrFraudRisk: existingRequest?.duplicateOrFraudRisk ?? false,
    generationJobId: existingRequest?.generationJobId ?? null,
    generatedDocumentId: existingRequest?.generatedDocumentId ?? null,
    schemaVersion: 2,
    createdAt: existingRequest?.createdAt ?? timestamp,
    updatedAt: timestamp,
    paidAt: existingRequest?.paidAt ?? null,
  };
  const batch = db.batch();

  batch.set(requestRef, request, { merge: true });
  batch.set(
    db.collection(USERS_COLLECTION).doc(ownerId),
    {
      originCountry: input.originCountry.label,
      originCountryReference: input.originCountry,
      nationality: input.nationality.label,
      nationalityReference: input.nationality,
      countryOfResidence: input.currentResidenceCountry.label,
      countryOfResidenceReference: input.currentResidenceCountry,
      destinationCountry: input.destinationCountry.label,
      destinationCountryReference: input.destinationCountry,
      updatedAt: timestamp,
      profileUpdatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    caseRef,
    {
      id: caseRef.id,
      uid: ownerId,
      caseNumber,
      clientEmail: request.clientEmail,
      clientName: fullName,
      productType: "ATTESTATION_HEBERGEMENT",
      status: "PAYMENT_PENDING",
      priority: existingCase?.get("priority") ?? "NORMAL",
      requestedAmount: 99,
      requestedCurrency: "EUR",
      region: "eu",
      destinationCountry: "France",
      destinationCountryReference: input.destinationCountry,
      destinationSchool: input.schoolName,
      schoolName: input.schoolName,
      intakeDate: input.expectedArrivalDate,
      paymentStatus: "PENDING",
      documentStatus: existingCase?.get("documentStatus") ?? "MISSING",
      financeStatus: existingCase?.get("financeStatus") ?? "NOT_STARTED",
      certificateStatus: existingCase?.get("certificateStatus") ?? "NOT_STARTED",
      nextAction: "Confirmer le paiement de l'attestation logement",
      assignedAdminId: existingCase?.get("assignedAdminId") ?? null,
      notes: existingCase?.get("notes") ?? null,
      source: existingCase?.get("source") ?? "client_request",
      createdAt: dateToIso(existingCase?.get("createdAt")) ?? timestamp,
      updatedAt: timestamp,
      housingRequestId: requestRef.id,
    },
    { merge: true },
  );

  if (!existingRequest) {
    const eventRef = db.collection(EVENTS_COLLECTION).doc();
    const notificationRef = db.collection(NOTIFICATIONS_COLLECTION).doc();

    batch.set(eventRef, {
      id: eventRef.id,
      caseId: caseRef.id,
      uid: ownerId,
      actorType: "client",
      actorId: ownerId,
      actorRole: "client",
      eventType: "housing_request_created",
      eventLabel: "Demande conditionnelle de logement creee",
      eventPayload: {
        housingRequestId: requestRef.id,
        preferredCityCode: inventory.cityCode,
        housingInventoryId: inventory.id,
        inventorySource,
        inventoryVersion: inventory.version,
        inventoryStatus: inventory.inventoryStatus,
      },
      createdAt: timestamp,
    });
    batch.set(notificationRef, {
      id: notificationRef.id,
      type: "new_case_created",
      severity: "info",
      title: "Nouvelle demande logement",
      body: `${caseNumber} : demande logement en attente de paiement.`,
      relatedUid: ownerId,
      relatedCaseId: caseRef.id,
      read: false,
      createdAt: timestamp,
    });
  }

  await batch.commit();
  return request;
}

export async function getLatestHousingRequestForOwner(ownerId: string) {
  return (await listOwnerRequests(ownerId))[0] ?? null;
}

export async function getHousingRequestById(requestId: string) {
  const snapshot = await getAdminFirestore()
    .collection(REQUESTS_COLLECTION)
    .doc(requestId)
    .get();
  return snapshot.exists
    ? mapHousingRequest(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      )
    : null;
}

export async function requireHousingRequestForCheckout(
  requestId: string,
  ownerId: string,
) {
  const request = await getHousingRequestById(requestId);

  if (!request || request.ownerId !== ownerId) {
    throw new Error("HOUSING_REQUEST_NOT_FOUND");
  }
  if (!["awaiting_payment", "payment_pending"].includes(request.status)) {
    throw new Error("HOUSING_REQUEST_NOT_PAYABLE");
  }

  return request;
}

export async function attachPaymentToHousingRequest({
  requestId,
  paymentId,
  amount,
  currency,
}: {
  requestId: string;
  paymentId: string;
  amount: number;
  currency: "eur";
}) {
  const timestamp = now();
  await getAdminFirestore().collection(REQUESTS_COLLECTION).doc(requestId).set(
    {
      paymentId,
      status: "payment_pending",
      paymentSnapshot: {
        capturedAt: timestamp,
        paymentId,
        serviceType: "accommodation_certificate",
        amount,
        currency,
      },
      updatedAt: timestamp,
    },
    { merge: true },
  );
}

function isHousingRequestComplete(request: HousingRequest) {
  return Boolean(
    request.schemaVersion >= 2 &&
      request.housingInventoryId &&
      request.selectionSnapshot &&
      request.selectionSnapshot.housingInventoryId === request.housingInventoryId &&
      request.studentFullName &&
      request.clientEmail &&
      request.studentDateOfBirth &&
      request.studentPlaceOfBirth &&
      request.nationality &&
      request.originCountry &&
      request.schoolName &&
      request.academicYear &&
      request.expectedArrivalDate &&
      request.expectedStayDurationMonths >= 1 &&
      request.expectedStayDurationMonths <= 24 &&
      request.consentAccuracy &&
      request.consentConditionalNature &&
      request.consentTerms &&
      request.consentDataProcessing &&
      request.consentAddressAdjustment,
  );
}

function buildAutomaticAllocation({
  request,
  inventory,
  timestamp,
}: {
  request: HousingRequest;
  inventory: ReturnType<typeof mapHousingInventoryItem>;
  timestamp: string;
}): HousingAllocation {
  const pricing =
    request.selectionSnapshot?.housingInventoryId === inventory.id &&
    request.selectionSnapshot.pricing
      ? request.selectionSnapshot.pricing
      : inventory.pricing;
  const monthlyRent = resolveHousingClientPricing(pricing)?.clientMonthlyRent;
  const validUntil = inventory.autoIssuance.validUntil;
  if (!monthlyRent || !validUntil) {
    throw new Error("HOUSING_AUTO_ALLOCATION_DATA_MISSING");
  }
  return {
    inventoryReference: inventory.internalReference,
    partnerName: inventory.partner.displayName,
    residenceName: inventory.residenceName,
    addressLine: inventory.address.line1,
    postalCode: inventory.address.postalCode,
    city: inventory.address.city,
    accommodationType: request.accommodationType,
    monthlyRent,
    currency: "EUR",
    confirmedAt:
      inventory.availability.lastConfirmedAt ??
      inventory.autoIssuance.approvedAt ??
      timestamp,
    confirmationReference:
      inventory.availability.confirmationReference ??
      `AUTO-POLICY-${inventory.internalReference}-V${inventory.version}`,
    validUntil,
    allocationReason: "Residence pre-validee pour emission conditionnelle automatique.",
    allocationVersion: (request.allocation?.allocationVersion ?? 0) + 1,
    approvedBy: inventory.autoIssuance.approvedByAdminUid ?? "housing-policy-engine",
    approvedAt: timestamp,
  };
}

function buildCertificateSnapshot({
  request,
  paymentId,
  allocation,
  inventoryVersion,
  source,
  timestamp,
  policyVersion,
}: {
  request: HousingRequest;
  paymentId: string;
  allocation: HousingAllocation;
  inventoryVersion: number;
  source: HousingCertificateSnapshot["source"];
  timestamp: string;
  policyVersion?: string;
}): HousingCertificateSnapshot {
  return {
    createdAt: timestamp,
    source,
    requestId: request.id,
    ownerId: request.ownerId,
    caseId: request.caseId,
    paymentId,
    student: {
      fullName: request.studentFullName,
      email: request.clientEmail,
      dateOfBirth: request.studentDateOfBirth,
      placeOfBirth: request.studentPlaceOfBirth,
      nationality: request.nationality,
      originCountry: request.originCountry,
      expectedArrivalDate: request.expectedArrivalDate,
      expectedStayDurationMonths: request.expectedStayDurationMonths,
      academicYear: request.academicYear,
      schoolName: request.schoolName,
    },
    housing: allocation,
    inventoryVersion,
    ...(policyVersion ? { policyVersion } : {}),
  };
}

function createHousingGenerationJob({
  request,
  paymentId,
  stripeEventId,
  createdBy,
  timestamp,
}: {
  request: HousingRequest;
  paymentId: string;
  stripeEventId: string;
  createdBy: HousingDocumentGenerationJob["createdBy"];
  timestamp: string;
}): HousingDocumentGenerationJob {
  return {
    id: `housing_${paymentId}`,
    serviceType: "conditional_housing_certificate",
    documentType: "accommodation_certificate",
    clientUid: request.ownerId,
    caseId: request.caseId,
    housingRequestId: request.id,
    paymentId,
    stripeEventId,
    status: "queued",
    attemptCount: 0,
    maxAttempts: 3,
    templateVersion: "housing-conditional-v4",
    requestedAt: timestamp,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    lastErrorCode: null,
    lastErrorMessageSanitized: null,
    generatedDocumentId: null,
    createdBy,
    idempotencyKey: `housing-certificate:${paymentId}`,
  };
}

async function notifyHousingReviewRequired({
  request,
  paymentId,
}: {
  request: HousingRequest;
  paymentId: string;
}) {
  const db = getAdminFirestore();
  const communicationRef = db
    .collection(COMMUNICATIONS_COLLECTION)
    .doc(`housing_review_${paymentId}`);
  const existingCommunication = await communicationRef.get();
  const timestamp = now();
  const clientResult = existingCommunication.exists && existingCommunication.get("status") === "SENT"
    ? {
        sent: true,
        messageId: safeString(existingCommunication.get("messageId")),
        status: "SENT" as const,
        provider: "resend" as const,
      }
    : await sendHousingReviewRequiredEmail({
        recipientEmail: request.clientEmail,
        studentFullName: request.studentFullName,
        clientSpaceUrl: `${(
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
        ).replace(/\/$/, "")}/dossier/logement`,
      });
  await communicationRef.set(
      {
        id: `housing_review_${paymentId}`,
        caseId: request.caseId,
        uid: request.ownerId,
        type: "email",
        template: "housing_review_required",
        recipient: request.clientEmail,
        status: clientResult.status,
        provider: clientResult.provider,
        messageId: clientResult.messageId,
        createdAt: timestamp,
        metadata: { housingRequestId: request.id, paymentId },
      },
      { merge: true },
  );
  const adminCommunicationRef = db
    .collection(COMMUNICATIONS_COLLECTION)
    .doc(`housing_review_admin_${paymentId}`);
  const existingAdminCommunication = await adminCommunicationRef.get();
  if (!existingAdminCommunication.exists || existingAdminCommunication.get("status") !== "SENT") {
    const residenceName = safeString(
      request.selectionSnapshot?.residenceName ?? request.selectionSnapshot?.partnerName,
    );
    const adminResult = await sendHousingAdminReviewRequiredEmail({
      clientName: request.clientName,
      clientEmail: request.clientEmail,
      caseId: request.caseId,
      city: request.preferredCity,
      residenceName,
      paymentId,
    });
    await adminCommunicationRef.set(
      {
        id: adminCommunicationRef.id,
        caseId: request.caseId,
        uid: request.ownerId,
        type: "email",
        template: "housing_admin_review_required",
        recipient: "admin_notification_email",
        status: adminResult.status,
        provider: adminResult.provider,
        messageId: adminResult.messageId,
        createdAt: timestamp,
        metadata: { housingRequestId: request.id, paymentId },
      },
      { merge: true },
    );
  }
  return clientResult;
}

export async function routeHousingGenerationFailureToAdminReview({
  request,
  errorCode,
}: {
  request: HousingRequest;
  errorCode: string;
}) {
  if (!request.paymentId) return;
  const db = getAdminFirestore();
  const timestamp = now();
  const batch = db.batch();
  const eventRef = db
    .collection(EVENTS_COLLECTION)
    .doc(`housing_generation_failed_${request.paymentId}`);
  const notificationRef = db
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(`housing_generation_failed_${request.paymentId}`);
  batch.set(
    db.collection(REQUESTS_COLLECTION).doc(request.id),
    { status: "requires_admin_review", updatedAt: timestamp },
    { merge: true },
  );
  batch.set(
    db.collection(CASES_COLLECTION).doc(request.caseId),
    {
      status: "UNDER_REVIEW",
      nextAction: "Relancer la generation de l'attestation logement",
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(eventRef, {
    id: eventRef.id,
    caseId: request.caseId,
    uid: request.ownerId,
    actorType: "system",
    actorId: "housing-certificate-worker",
    actorRole: "system",
    eventType: "housing_generation_failed",
    eventLabel: "Generation logement en echec - revue administrative requise",
    eventPayload: { housingRequestId: request.id, errorCode: errorCode.slice(0, 120) },
    createdAt: timestamp,
  });
  batch.set(
    notificationRef,
    {
      id: notificationRef.id,
      type: "admin_action_required",
      severity: "error",
      title: "Generation logement a relancer",
      body: `${request.clientName} : le document n'a pas ete emis et requiert une intervention.`,
      relatedUid: request.ownerId,
      relatedCaseId: request.caseId,
      read: false,
      createdAt: timestamp,
      metadata: { housingRequestId: request.id, errorCode: errorCode.slice(0, 120) },
    },
    { merge: true },
  );
  await batch.commit();
  await notifyHousingReviewRequired({ request, paymentId: request.paymentId });
}

export async function evaluateHousingCertificateAfterPayment({
  requestId,
  paymentId,
  stripeEventId,
  paidAt,
}: {
  requestId: string;
  paymentId: string;
  stripeEventId: string;
  paidAt: string;
}) {
  const initialRequest = await getHousingRequestById(requestId);
  if (!initialRequest || initialRequest.paymentId !== paymentId) {
    throw new Error("HOUSING_REQUEST_PAYMENT_MISMATCH");
  }
  if (!initialRequest.housingInventoryId) {
    throw new Error("HOUSING_INVENTORY_NOT_SELECTED");
  }

  const selectedInventorySource = initialRequest.selectionSnapshot?.inventorySource;
  const inventoryResult = await getHousingResidenceById(
    initialRequest.housingInventoryId,
    selectedInventorySource === "firestore" || selectedInventorySource === "bootstrap"
      ? { source: selectedInventorySource }
      : undefined,
  );
  if (!inventoryResult.data || inventoryResult.source === "unavailable") {
    throw new Error("HOUSING_INVENTORY_NOT_FOUND");
  }
  const resolvedInventory = inventoryResult.data;

  const ownerRequests = await listOwnerRequests(initialRequest.ownerId);
  const duplicateOrFraudRisk =
    initialRequest.duplicateOrFraudRisk ||
    ownerRequests.some(
      (other) =>
        other.id !== initialRequest.id &&
        other.housingInventoryId === initialRequest.housingInventoryId &&
        other.academicYear === initialRequest.academicYear &&
        other.expectedArrivalDate === initialRequest.expectedArrivalDate &&
        Boolean(other.paymentId),
    );

  const db = getAdminFirestore();
  const jobId = `housing_${paymentId}`;
  const jobRef = db.collection(JOBS_COLLECTION).doc(jobId);
  const timestamp = now();
  const result = await db.runTransaction(async (transaction) => {
    const requestRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(paymentId);
    const inventoryRef = db
      .collection(INVENTORY_COLLECTION)
      .doc(initialRequest.housingInventoryId as string);
    const [requestSnapshot, paymentSnapshot, existingJob] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(paymentRef),
      transaction.get(jobRef),
    ]);
    const inventorySnapshot =
      inventoryResult.source === "firestore"
        ? await transaction.get(inventoryRef)
        : null;
    if (!requestSnapshot.exists) throw new Error("HOUSING_REQUEST_NOT_FOUND");
    if (inventorySnapshot && !inventorySnapshot.exists) {
      throw new Error("HOUSING_INVENTORY_NOT_FOUND");
    }
    const request = mapHousingRequest(
      requestSnapshot.id,
      requestSnapshot.data() as Record<string, unknown>,
    );
    const inventory = inventorySnapshot
      ? mapHousingInventoryItem(
          inventorySnapshot.id,
          inventorySnapshot.data() as Record<string, unknown>,
        )
      : resolvedInventory;
    if (
      request.autoDecisionSnapshot?.eligible &&
      request.generationJobId === jobId &&
      existingJob.exists
    ) {
      return {
        request,
        decision: request.autoDecisionSnapshot,
        job: {
          ...(existingJob.data() as HousingDocumentGenerationJob),
          id: jobId,
        },
        automaticGenerationQueued: true,
        shouldNotifyReview: false,
      };
    }
    if (
      request.autoDecisionSnapshot &&
      !request.autoDecisionSnapshot.eligible &&
      request.status === "requires_admin_review"
    ) {
      return {
        request,
        decision: request.autoDecisionSnapshot,
        job: null,
        automaticGenerationQueued: false,
        shouldNotifyReview: false,
      };
    }
    const paymentConfirmed = Boolean(
      paymentSnapshot.exists &&
        paymentSnapshot.get("status") === "paid" &&
        paymentSnapshot.get("ownerId") === request.ownerId &&
        paymentSnapshot.get("housingRequestId") === request.id &&
        paymentSnapshot.get("serviceType") === "accommodation_certificate",
    );
    const decision = evaluateHousingAutoIssuance({
      inventory,
      expectedArrivalDate: request.expectedArrivalDate,
      requestComplete: isHousingRequestComplete(request),
      paymentConfirmed,
      duplicateOrFraudRisk,
      globalKillSwitchEnabled: process.env.HOUSING_AUTO_ISSUANCE_ENABLED === "true",
      evaluatedAt: timestamp,
    });
    const eventRef = db.collection(EVENTS_COLLECTION).doc(`housing_payment_${paymentId}`);

    if (decision.eligible) {
      const allocation = buildAutomaticAllocation({ request, inventory, timestamp });
      const certificateSnapshot = buildCertificateSnapshot({
        request,
        paymentId,
        allocation,
        inventoryVersion: inventory.version,
        source: "automatic_policy",
        timestamp,
        policyVersion: decision.policyVersion,
      });
      const job = existingJob.exists
        ? ({
            ...(existingJob.data() as HousingDocumentGenerationJob),
            id: jobId,
          } as HousingDocumentGenerationJob)
        : createHousingGenerationJob({
            request,
            paymentId,
            stripeEventId,
            createdBy: "stripe_webhook",
            timestamp,
          });
      transaction.set(
        requestRef,
        {
          status: "auto_approved_generation_queued",
          paidAt,
          allocation,
          autoDecisionSnapshot: decision,
          certificateSnapshot,
          duplicateOrFraudRisk,
          generationJobId: jobId,
          updatedAt: timestamp,
        },
        { merge: true },
      );
      transaction.set(
        db.collection(CASES_COLLECTION).doc(request.caseId),
        {
          status: "PAYMENT_CONFIRMED",
          paymentStatus: "CONFIRMED",
          certificateStatus: "NOT_STARTED",
          nextAction: "Generation automatique de l'attestation en cours",
          housingRequestId: request.id,
          updatedAt: timestamp,
        },
        { merge: true },
      );
      transaction.set(jobRef, job, { merge: true });
      if (
        inventoryResult.source === "firestore" &&
        inventory.autoIssuance.conditionalCapacity !== undefined
      ) {
        transaction.set(
          inventoryRef,
          {
            autoIssuance: {
              ...inventory.autoIssuance,
              remainingConditionalCapacity:
                (inventory.autoIssuance.remainingConditionalCapacity ?? 0) - 1,
            },
            version: inventory.version + 1,
            updatedAt: timestamp,
          },
          { merge: true },
        );
      }
      transaction.set(eventRef, {
        id: eventRef.id,
        caseId: request.caseId,
        uid: request.ownerId,
        actorType: "system",
        actorId: "housing-policy-engine",
        actorRole: "system",
        eventType: "housing_auto_issuance_approved",
        eventLabel: "Paiement confirme et emission automatique approuvee",
        eventPayload: {
          housingRequestId: request.id,
          paymentId,
          stripeEventId,
          generationJobId: jobId,
          policyVersion: decision.policyVersion,
        },
        createdAt: timestamp,
      });
      return {
        request,
        decision,
        job,
        automaticGenerationQueued: true,
        shouldNotifyReview: false,
      };
    }

    transaction.set(
      requestRef,
      {
        status: "requires_admin_review",
        paidAt,
        autoDecisionSnapshot: decision,
        duplicateOrFraudRisk,
        generationJobId: null,
        updatedAt: timestamp,
      },
      { merge: true },
    );
    transaction.set(
      db.collection(CASES_COLLECTION).doc(request.caseId),
      {
        status: "UNDER_REVIEW",
        paymentStatus: "CONFIRMED",
        nextAction: "Examiner la demande logement payee",
        housingRequestId: request.id,
        updatedAt: timestamp,
      },
      { merge: true },
    );
    transaction.set(eventRef, {
      id: eventRef.id,
      caseId: request.caseId,
      uid: request.ownerId,
      actorType: "system",
      actorId: "housing-policy-engine",
      actorRole: "system",
      eventType: "housing_admin_review_required",
      eventLabel: "Paiement confirme - verification administrative requise",
      eventPayload: {
        housingRequestId: request.id,
        paymentId,
        stripeEventId,
        reasons: decision.reasons,
        policyVersion: decision.policyVersion,
      },
      createdAt: timestamp,
    });
    const notificationRef = db
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(`housing_review_${paymentId}`);
    transaction.set(
      notificationRef,
      {
        id: notificationRef.id,
        type: "admin_action_required",
        severity: "warning",
        title: "Nouvelle demande logement payee - validation requise",
        body: `${request.clientName} : paiement confirme, verification administrative requise avant emission.`,
        relatedUid: request.ownerId,
        relatedCaseId: request.caseId,
        read: false,
        createdAt: timestamp,
        metadata: {
          housingRequestId: request.id,
          paymentId,
          city: request.preferredCity,
          residenceName: request.selectionSnapshot?.residenceName ?? null,
          reasons: decision.reasons,
        },
      },
      { merge: true },
    );
    return {
      request,
      decision,
      job: null,
      automaticGenerationQueued: false,
      shouldNotifyReview: true,
    };
  });

  if (result.shouldNotifyReview) {
    await notifyHousingReviewRequired({ request: result.request, paymentId });
  }
  return result;
}

export async function getHousingRequestForCase(caseId: string) {
  const snapshot = await getAdminFirestore()
    .collection(REQUESTS_COLLECTION)
    .where("caseId", "==", caseId)
    .limit(1)
    .get();
  const [request] = snapshot.docs;

  return request
    ? mapHousingRequest(
        request.id,
        request.data() as Record<string, unknown>,
      )
    : null;
}

export async function listHousingRequestsForAdmin({
  caseId,
  ownerId,
}: {
  caseId?: string | null;
  ownerId?: string | null;
}) {
  const collection = getAdminFirestore().collection(REQUESTS_COLLECTION);
  const snapshot = caseId
    ? await collection.where("caseId", "==", caseId).limit(20).get()
    : ownerId
      ? await collection.where("ownerId", "==", ownerId).limit(20).get()
      : await collection.limit(100).get();

  return snapshot.docs
    .map((document) =>
      mapHousingRequest(
        document.id,
        document.data() as Record<string, unknown>,
      ),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function approveHousingAllocation({
  requestId,
  input,
  actor,
}: {
  requestId: string;
  input: HousingAllocationInput;
  actor: AdminActor;
}) {
  const request = await getHousingRequestById(requestId);
  if (!request) throw new Error("HOUSING_REQUEST_NOT_FOUND");
  if (!request.paymentId) throw new Error("HOUSING_PAYMENT_NOT_FOUND");
  if (
    request.certificateSnapshot &&
    request.generationJobId &&
    [
      "admin_approved_generation_queued",
      "generation_processing",
      "certificate_generation_pending",
    ].includes(request.status)
  ) {
    return request;
  }
  if (
    request.generatedDocumentId ||
    ["certificate_generated", "certificate_delivered", "replaced", "revoked"].includes(
      request.status,
    )
  ) {
    throw new Error("HOUSING_DOCUMENT_ALREADY_ISSUED");
  }

  const db = getAdminFirestore();
  const payment = await db
    .collection(PAYMENTS_COLLECTION)
    .doc(request.paymentId)
    .get();
  if (
    !payment.exists ||
    payment.get("status") !== "paid" ||
    payment.get("ownerId") !== request.ownerId ||
    payment.get("housingRequestId") !== request.id
  ) {
    throw new Error("HOUSING_PAYMENT_NOT_CONFIRMED");
  }

  const expectedMonthlyRent =
    resolveHousingClientPricing(
      request.selectionSnapshot?.pricing ?? {
        monthlyRentForCertificate: request.indicativeMonthlyRent,
      },
    )?.clientMonthlyRent ?? request.indicativeMonthlyRent;
  const pricingOverridden = !sameHousingMoneyAmount(
    input.monthlyRent,
    expectedMonthlyRent,
  );
  if (pricingOverridden && !input.pricingOverrideReason) {
    throw new Error("HOUSING_PRICING_OVERRIDE_REASON_REQUIRED");
  }

  const timestamp = now();
  const { pricingOverrideReason, ...allocationInput } = input;
  const allocation = {
    ...allocationInput,
    allocationVersion: (request.allocation?.allocationVersion ?? 0) + 1,
    approvedBy: actor.uid,
    approvedAt: timestamp,
    ...(pricingOverridden
      ? {
          pricingOverride: {
            expectedMonthlyRent,
            actualMonthlyRent: input.monthlyRent,
            reason: pricingOverrideReason as string,
          },
        }
      : {}),
  };
  const adminApprovalSnapshot = {
    approvedAt: timestamp,
    approvedBy: actor.uid,
    approvedByRole: actor.role,
    reason: input.allocationReason,
    confirmationReference: input.confirmationReference,
  };
  const certificateSnapshot = buildCertificateSnapshot({
    request,
    paymentId: request.paymentId,
    allocation,
    inventoryVersion: request.selectionSnapshot?.inventoryVersion ?? 0,
    source: "admin_approval",
    timestamp,
    policyVersion: request.autoDecisionSnapshot?.policyVersion,
  });
  const job = createHousingGenerationJob({
    request,
    paymentId: request.paymentId,
    stripeEventId: safeString(payment.get("lastStripeEventId")) ?? "admin-approval",
    createdBy: "admin",
    timestamp,
  });
  const batch = db.batch();
  const eventRef = db.collection(EVENTS_COLLECTION).doc();

  batch.set(
    db.collection(REQUESTS_COLLECTION).doc(request.id),
    {
      allocation,
      adminApprovalSnapshot,
      certificateSnapshot,
      generationJobId: job.id,
      status: "admin_approved_generation_queued",
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    db.collection(CASES_COLLECTION).doc(request.caseId),
    {
      status: "PAYMENT_CONFIRMED",
      nextAction: "Generation de l'attestation conditionnelle en cours",
      housingRequestId: request.id,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(db.collection(JOBS_COLLECTION).doc(job.id), job, { merge: true });
  batch.set(eventRef, {
    id: eventRef.id,
    caseId: request.caseId,
    uid: request.ownerId,
    actorType: "admin",
    actorId: actor.uid,
    actorRole: actor.role,
    eventType: "housing_allocation_confirmed",
    eventLabel: "Disponibilite logement confirmee par l'admin",
    eventPayload: {
      housingRequestId: request.id,
      inventoryReference: input.inventoryReference,
      confirmationReference: input.confirmationReference,
      allocationVersion: allocation.allocationVersion,
      generationJobId: job.id,
      pricingOverride: allocation.pricingOverride ?? null,
    },
    createdAt: timestamp,
  });
  await batch.commit();

  return {
    ...request,
    allocation,
    adminApprovalSnapshot,
    certificateSnapshot,
    generationJobId: job.id,
    status: "admin_approved_generation_queued" as const,
  };
}
