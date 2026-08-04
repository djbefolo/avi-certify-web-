import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type { HousingInventoryGovernanceInput } from "@/lib/validations/housing";
import type {
  HousingAccommodationType,
  HousingInventoryItem,
  HousingSelectionSnapshot,
} from "@/types/housing";

const INVENTORY_COLLECTION = "housing_inventory";
const AUDIT_COLLECTION = "admin_financial_audit_events";

function now() {
  return new Date().toISOString();
}

function dateToIso(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return undefined;
}

function cleanObject<T extends Record<string, unknown>>(value: unknown): T {
  return value && typeof value === "object" ? (value as T) : ({} as T);
}

function cleanAccommodationTypes(value: unknown): HousingAccommodationType[] {
  const allowed: HousingAccommodationType[] = [
    "studio",
    "t1_bis",
    "t2",
    "shared",
    "other",
  ];
  return Array.isArray(value)
    ? value.filter((item): item is HousingAccommodationType =>
        allowed.includes(item as HousingAccommodationType),
      )
    : [];
}

export function mapHousingInventoryItem(
  id: string,
  data: Record<string, unknown>,
): HousingInventoryItem {
  const partner = cleanObject<Record<string, unknown>>(data.partner);
  const address = cleanObject<Record<string, unknown>>(data.address);
  const publicAddress = cleanObject<Record<string, unknown>>(data.publicAddress);
  const pricing = cleanObject<Record<string, unknown>>(data.pricing);
  const autoIssuance = cleanObject<Record<string, unknown>>(data.autoIssuance);
  const availability = cleanObject<Record<string, unknown>>(data.availability);
  const source = cleanObject<Record<string, unknown>>(data.source);
  const inventoryStatuses: HousingInventoryItem["inventoryStatus"][] = [
    "draft",
    "available",
    "conditionally_available",
    "confirmation_required",
    "unavailable",
    "suspended",
    "archived",
  ];

  return {
    ...(data as unknown as HousingInventoryItem),
    id,
    countryCode: "FR",
    countryName: "France",
    residenceName: String(data.residenceName ?? partner.operatorName ?? ""),
    partner: {
      ...(partner.id ? { id: String(partner.id) } : {}),
      displayName: String(partner.displayName ?? ""),
      ...(partner.operatorName ? { operatorName: String(partner.operatorName) } : {}),
    },
    address: {
      line1: String(address.line1 ?? ""),
      ...(address.line2 ? { line2: String(address.line2) } : {}),
      postalCode: String(address.postalCode ?? data.postalCode ?? ""),
      city: String(address.city ?? data.municipality ?? ""),
      country: "France",
      formattedAddress: String(address.formattedAddress ?? ""),
    },
    publicAddress: {
      formattedAddress: String(
        publicAddress.formattedAddress ?? address.formattedAddress ?? "",
      ),
      displayToClient: publicAddress.displayToClient === true,
      ...(dateToIso(publicAddress.validatedAt)
        ? { validatedAt: dateToIso(publicAddress.validatedAt) }
        : {}),
      ...(typeof publicAddress.validatedByAdminUid === "string"
        ? { validatedByAdminUid: publicAddress.validatedByAdminUid }
        : {}),
    },
    accommodationTypes: cleanAccommodationTypes(data.accommodationTypes),
    inventoryStatus: inventoryStatuses.includes(
      data.inventoryStatus as HousingInventoryItem["inventoryStatus"],
    )
      ? (data.inventoryStatus as HousingInventoryItem["inventoryStatus"])
      : "draft",
    availabilityGuaranteed: false,
    isVisibleToClients: data.isVisibleToClients === true,
    isEligibleForCertificate: data.isEligibleForCertificate === true,
    pricing: {
      currency: "EUR",
      ...(typeof pricing.cityIndicativePrice === "number"
        ? { cityIndicativePrice: pricing.cityIndicativePrice }
        : {}),
      ...(typeof pricing.residenceDisplayedRent === "number"
        ? { residenceDisplayedRent: pricing.residenceDisplayedRent }
        : {}),
      ...(typeof pricing.monthlyRentForCertificate === "number"
        ? { monthlyRentForCertificate: pricing.monthlyRentForCertificate }
        : {}),
      ...(typeof pricing.serviceFee === "number" ? { serviceFee: pricing.serviceFee } : {}),
      priceValidationStatus:
        pricing.priceValidationStatus === "verified" ||
        pricing.priceValidationStatus === "requires_admin_review"
          ? pricing.priceValidationStatus
          : "unverified",
    },
    autoIssuance: {
      enabled: autoIssuance.enabled === true,
      eligibilityStatus:
        autoIssuance.eligibilityStatus === "eligible" ||
        autoIssuance.eligibilityStatus === "suspended" ||
        autoIssuance.eligibilityStatus === "expired"
          ? autoIssuance.eligibilityStatus
          : "manual_review_only",
      ...(dateToIso(autoIssuance.validUntil)
        ? { validUntil: dateToIso(autoIssuance.validUntil) }
        : {}),
      ...(typeof autoIssuance.approvedByAdminUid === "string"
        ? { approvedByAdminUid: autoIssuance.approvedByAdminUid }
        : {}),
      ...(dateToIso(autoIssuance.approvedAt)
        ? { approvedAt: dateToIso(autoIssuance.approvedAt) }
        : {}),
      ...(typeof autoIssuance.conditionalCapacity === "number"
        ? { conditionalCapacity: autoIssuance.conditionalCapacity }
        : {}),
      ...(typeof autoIssuance.remainingConditionalCapacity === "number"
        ? { remainingConditionalCapacity: autoIssuance.remainingConditionalCapacity }
        : {}),
      ...(dateToIso(autoIssuance.arrivalDateFrom)
        ? { arrivalDateFrom: dateToIso(autoIssuance.arrivalDateFrom) }
        : {}),
      ...(dateToIso(autoIssuance.arrivalDateUntil)
        ? { arrivalDateUntil: dateToIso(autoIssuance.arrivalDateUntil) }
        : {}),
      ...(typeof autoIssuance.manualReviewRequired === "boolean"
        ? { manualReviewRequired: autoIssuance.manualReviewRequired }
        : {}),
      ...(typeof autoIssuance.stopReason === "string"
        ? { stopReason: autoIssuance.stopReason }
        : {}),
    },
    availability: {
      ...(dateToIso(availability.lastConfirmedAt)
        ? { lastConfirmedAt: dateToIso(availability.lastConfirmedAt) }
        : {}),
      ...(typeof availability.confirmedBy === "string"
        ? { confirmedBy: availability.confirmedBy }
        : {}),
      ...(typeof availability.confirmationReference === "string"
        ? { confirmationReference: availability.confirmationReference }
        : {}),
    },
    source: {
      ...(typeof source.officialUrl === "string" ? { officialUrl: source.officialUrl } : {}),
      ...(dateToIso(source.lastCheckedAt)
        ? { lastCheckedAt: dateToIso(source.lastCheckedAt) }
        : {}),
      ...(typeof source.workbookName === "string"
        ? { workbookName: source.workbookName }
        : {}),
      ...(typeof source.sheetName === "string" ? { sheetName: source.sheetName } : {}),
      ...(typeof source.sourceRow === "number" ? { sourceRow: source.sourceRow } : {}),
      ...(typeof source.importBatchId === "string"
        ? { importBatchId: source.importBatchId }
        : {}),
    },
    version: typeof data.version === "number" ? data.version : 1,
    createdAt: dateToIso(data.createdAt) ?? now(),
    updatedAt: dateToIso(data.updatedAt) ?? now(),
  };
}

export async function getHousingInventoryItemById(id: string) {
  const snapshot = await getAdminFirestore().collection(INVENTORY_COLLECTION).doc(id).get();
  return snapshot.exists
    ? mapHousingInventoryItem(snapshot.id, snapshot.data() as Record<string, unknown>)
    : null;
}

export async function listHousingInventoryForAdmin() {
  const snapshot = await getAdminFirestore().collection(INVENTORY_COLLECTION).limit(500).get();
  return snapshot.docs
    .map((document) =>
      mapHousingInventoryItem(document.id, document.data() as Record<string, unknown>),
    )
    .sort((a, b) =>
      `${a.cityLabel}-${a.partner.displayName}`.localeCompare(
        `${b.cityLabel}-${b.partner.displayName}`,
        "fr",
      ),
    );
}

export async function listPublicHousingInventory(cityCode?: string | null) {
  const items = await listHousingInventoryForAdmin();
  return items.filter(
    (item) =>
      item.isVisibleToClients &&
      !["unavailable", "suspended", "archived"].includes(item.inventoryStatus) &&
      (!cityCode || item.cityCode === cityCode),
  );
}

export async function listPublicHousingCities() {
  const items = await listPublicHousingInventory();
  const cities = new Map<
    string,
    { code: string; label: string; country: "France"; residenceCount: number }
  >();
  for (const item of items) {
    const current = cities.get(item.cityCode);
    cities.set(item.cityCode, {
      code: item.cityCode,
      label: item.cityLabel,
      country: "France",
      residenceCount: (current?.residenceCount ?? 0) + 1,
    });
  }
  return [...cities.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function createHousingSelectionSnapshot({
  inventory,
  accommodationType,
  selectedAt,
}: {
  inventory: HousingInventoryItem;
  accommodationType: HousingAccommodationType;
  selectedAt: string;
}): HousingSelectionSnapshot {
  return {
    selectedAt,
    housingInventoryId: inventory.id,
    inventoryVersion: inventory.version,
    internalReference: inventory.internalReference,
    partnerName: inventory.partner.displayName,
    residenceName: inventory.residenceName,
    cityCode: inventory.cityCode,
    cityLabel: inventory.cityLabel,
    municipality: inventory.municipality,
    address: inventory.address,
    accommodationTypes: inventory.accommodationTypes,
    selectedAccommodationType: accommodationType,
    pricing: inventory.pricing,
  };
}

export async function updateHousingInventoryGovernance({
  inventoryId,
  input,
  actor,
}: {
  inventoryId: string;
  input: HousingInventoryGovernanceInput;
  actor: AdminActor;
}) {
  const db = getAdminFirestore();
  const ref = db.collection(INVENTORY_COLLECTION).doc(inventoryId);
  const timestamp = now();

  const updated = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("HOUSING_INVENTORY_NOT_FOUND");
    const current = mapHousingInventoryItem(
      snapshot.id,
      snapshot.data() as Record<string, unknown>,
    );
    const nextPricing = {
      ...current.pricing,
      ...(input.priceValidationStatus
        ? { priceValidationStatus: input.priceValidationStatus }
        : {}),
      ...(input.monthlyRentForCertificate
        ? { monthlyRentForCertificate: input.monthlyRentForCertificate }
        : {}),
    };
    const nextAutoIssuance = {
      ...current.autoIssuance,
      ...(input.autoIssuanceEnabled !== undefined
        ? { enabled: input.autoIssuanceEnabled }
        : {}),
      ...(input.eligibilityStatus ? { eligibilityStatus: input.eligibilityStatus } : {}),
      ...(input.validUntil ? { validUntil: input.validUntil } : {}),
      ...(input.conditionalCapacity !== undefined
        ? { conditionalCapacity: input.conditionalCapacity }
        : {}),
      ...(input.remainingConditionalCapacity !== undefined
        ? { remainingConditionalCapacity: input.remainingConditionalCapacity }
        : {}),
      ...(input.arrivalDateFrom ? { arrivalDateFrom: input.arrivalDateFrom } : {}),
      ...(input.arrivalDateUntil ? { arrivalDateUntil: input.arrivalDateUntil } : {}),
      ...(input.manualReviewRequired !== undefined
        ? { manualReviewRequired: input.manualReviewRequired }
        : {}),
      ...(input.stopReason !== undefined ? { stopReason: input.stopReason } : {}),
    };
    const nextInventoryStatus = input.inventoryStatus ?? current.inventoryStatus;
    const nextPublicAddress: NonNullable<HousingInventoryItem["publicAddress"]> = {
      formattedAddress:
        input.publicAddressFormattedAddress ??
        current.publicAddress?.formattedAddress ??
        "",
      displayToClient:
        input.publicAddressDisplayToClient ??
        current.publicAddress?.displayToClient ??
        false,
      ...(current.publicAddress?.validatedAt
        ? { validatedAt: current.publicAddress.validatedAt }
        : {}),
      ...(current.publicAddress?.validatedByAdminUid
        ? { validatedByAdminUid: current.publicAddress.validatedByAdminUid }
        : {}),
    };
    if (nextPublicAddress.displayToClient && !nextPublicAddress.formattedAddress.trim()) {
      throw new Error("HOUSING_PUBLIC_ADDRESS_REQUIRED");
    }
    if (input.publicAddressDisplayToClient === true) {
      nextPublicAddress.validatedAt = timestamp;
      nextPublicAddress.validatedByAdminUid = actor.uid;
    }
    const nextEligibleForCertificate =
      input.isEligibleForCertificate ?? current.isEligibleForCertificate;
    if (nextAutoIssuance.enabled) {
      if (
        nextAutoIssuance.eligibilityStatus !== "eligible" ||
        nextAutoIssuance.manualReviewRequired !== false ||
        !nextEligibleForCertificate ||
        !["available", "conditionally_available"].includes(nextInventoryStatus) ||
        (nextAutoIssuance.conditionalCapacity !== undefined &&
          (!nextAutoIssuance.remainingConditionalCapacity ||
            nextAutoIssuance.remainingConditionalCapacity <= 0)) ||
        nextPricing.priceValidationStatus !== "verified" ||
        !nextPricing.monthlyRentForCertificate ||
        !nextAutoIssuance.validUntil ||
        Date.parse(nextAutoIssuance.validUntil) <= Date.now()
      ) {
        throw new Error("HOUSING_AUTO_ISSUANCE_POLICY_INCOMPLETE");
      }
      nextAutoIssuance.approvedByAdminUid = actor.uid;
      nextAutoIssuance.approvedAt = timestamp;
    }
    if (
      nextAutoIssuance.conditionalCapacity !== undefined &&
      nextAutoIssuance.remainingConditionalCapacity !== undefined &&
      nextAutoIssuance.remainingConditionalCapacity > nextAutoIssuance.conditionalCapacity
    ) {
      throw new Error("HOUSING_CAPACITY_INVALID");
    }
    const update = {
      ...(input.inventoryStatus ? { inventoryStatus: input.inventoryStatus } : {}),
      ...(input.isVisibleToClients !== undefined
        ? { isVisibleToClients: input.isVisibleToClients }
        : {}),
      publicAddress: nextPublicAddress,
      ...(input.isEligibleForCertificate !== undefined
        ? { isEligibleForCertificate: input.isEligibleForCertificate }
        : {}),
      pricing: nextPricing,
      autoIssuance: nextAutoIssuance,
      availability: {
        ...current.availability,
        lastConfirmedAt: timestamp,
        confirmedBy: actor.uid,
        ...(input.confirmationReference
          ? { confirmationReference: input.confirmationReference }
          : {}),
      },
      version: current.version + 1,
      updatedAt: timestamp,
    };
    transaction.set(ref, update, { merge: true });
    const auditRef = db.collection(AUDIT_COLLECTION).doc();
    transaction.set(auditRef, {
      id: auditRef.id,
      type: "product_updated",
      action: "housing_inventory_policy_updated",
      createdAt: timestamp,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      actor: actor.uid,
      actorId: actor.uid,
      actorLabel: actor.email ?? actor.uid,
      actorRole: actor.role,
      targetCollection: INVENTORY_COLLECTION,
      targetId: inventoryId,
      resourceType: "housing_inventory",
      resourceId: inventoryId,
      metadata: {
        beforeVersion: current.version,
        afterVersion: current.version + 1,
        autoIssuanceEnabled: nextAutoIssuance.enabled,
        eligibilityStatus: nextAutoIssuance.eligibilityStatus,
        publicAddressDisplayToClient: nextPublicAddress.displayToClient,
      },
    });
    return mapHousingInventoryItem(inventoryId, { ...current, ...update });
  });

  return updated;
}
