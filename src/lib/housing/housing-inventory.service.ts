import "server-only";

import {
  HOUSING_INVENTORY,
  canAutoIssueFromBootstrap,
  getBootstrapHousingCities,
  getBootstrapHousingResidenceById,
  getBootstrapHousingResidencesByCity,
  type HousingBootstrapResidence,
} from "@/data/housing-inventory.bootstrap";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  buildHousingClientPricing,
  resolveHousingPartnerRent,
  resolveHousingSnapshotRent,
} from "@/lib/housing/housing-pricing";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type { HousingInventoryGovernanceInput } from "@/lib/validations/housing";
import type {
  HousingAccommodationType,
  HousingInventoryItem,
  HousingInventorySource,
  HousingSelectionSnapshot,
} from "@/types/housing";

const INVENTORY_COLLECTION = "housing_inventory";
const AUDIT_COLLECTION = "admin_financial_audit_events";

export type PublicHousingCity = {
  code: string;
  label: string;
  country: "France";
  residenceCount: number;
  minimumDisplayedRent: number | null;
  currency: "EUR";
  availabilityLabel: string;
};

export type HousingInventoryResult<T> = {
  source: HousingInventorySource;
  data: T;
};

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

function normalizeBootstrapAccommodationTypes(
  value: readonly string[],
): HousingAccommodationType[] {
  const labels: Record<string, HousingAccommodationType> = {
    studio: "studio",
    "t1 bis": "t1_bis",
    t2: "t2",
    colocation: "shared",
    partage: "shared",
    autre: "other",
  };
  return value
    .map((item) => labels[item.trim().toLocaleLowerCase("fr-FR")])
    .filter((item): item is HousingAccommodationType => Boolean(item));
}

function assertBootstrapPolicy() {
  if (canAutoIssueFromBootstrap() !== false) {
    throw new Error("HOUSING_BOOTSTRAP_POLICY_INVALID");
  }

  const invalidResidence = HOUSING_INVENTORY.cities
    .flatMap((city) => city.residences)
    .find(
      (residence) =>
        residence.autoIssuance.enabled !== false ||
        residence.autoIssuance.eligibilityStatus !== "manual_review_only" ||
        residence.autoIssuance.manualReviewRequired !== true ||
        residence.manualReviewRequired !== true,
    );
  if (invalidResidence) {
    throw new Error("HOUSING_BOOTSTRAP_POLICY_INVALID");
  }
}

function mapBootstrapHousingInventoryItem(
  residence: HousingBootstrapResidence,
): HousingInventoryItem {
  assertBootstrapPolicy();
  const accommodationTypes = normalizeBootstrapAccommodationTypes(
    residence.accommodationTypes,
  );
  const partnerName =
    residence.partner.commercialName || residence.partner.operatorName;

  return applyConfiguredHousingDiscount(mapHousingInventoryItem(residence.id, {
    ...residence,
    partner: {
      displayName: partnerName,
      operatorName: residence.partner.operatorName,
    },
    accommodationTypes,
    pricing: {
      ...residence.pricing,
      cityIndicativePrice: residence.pricing.cityStartingPrice,
    },
    inventoryStatus: residence.availability.status,
    availabilityGuaranteed: false,
    availability: {
      lastConfirmedAt: residence.availability.lastCheckedAt,
    },
    isVisibleToClients:
      residence.isVisibleToClients && residence.isSelectableForConditionalRequest,
    autoIssuance: {
      enabled: false,
      eligibilityStatus: "manual_review_only",
      manualReviewRequired: true,
      stopReason: "Inventaire bootstrap soumis à validation administrative",
    },
    publicDescription: residence.availability.operationalLabel,
    version: 1,
    createdAt: HOUSING_INVENTORY.generatedAt,
    updatedAt: HOUSING_INVENTORY.generatedAt,
  }));
}

function listBootstrapHousingInventory(cityCode?: string | null) {
  assertBootstrapPolicy();
  const residences = cityCode
    ? getBootstrapHousingResidencesByCity(cityCode)
    : getBootstrapHousingCities().flatMap((city) => city.residences);
  return residences.map(mapBootstrapHousingInventoryItem);
}

function isPubliclySelectable(item: HousingInventoryItem) {
  return (
    item.isVisibleToClients &&
    !["unavailable", "suspended", "archived"].includes(item.inventoryStatus)
  );
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
      ...(typeof pricing.partnerMonthlyRent === "number"
        ? { partnerMonthlyRent: pricing.partnerMonthlyRent }
        : {}),
      ...(typeof pricing.discountBasisPoints === "number"
        ? { discountBasisPoints: pricing.discountBasisPoints }
        : {}),
      ...(typeof pricing.clientMonthlyRent === "number"
        ? { clientMonthlyRent: pricing.clientMonthlyRent }
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

function applyConfiguredHousingDiscount(
  inventory: HousingInventoryItem,
): HousingInventoryItem {
  const partnerMonthlyRent = resolveHousingPartnerRent(inventory.pricing);
  if (partnerMonthlyRent === null) {
    throw new Error("HOUSING_PARTNER_RENT_MISSING");
  }

  return {
    ...inventory,
    pricing: {
      ...inventory.pricing,
      ...buildHousingClientPricing(partnerMonthlyRent),
    },
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

async function resolveHousingInventory(
  cityCode?: string | null,
): Promise<HousingInventoryResult<HousingInventoryItem[]>> {
  try {
    const firestoreItems = await listHousingInventoryForAdmin();
    if (firestoreItems.length > 0) {
      return {
        source: "firestore",
        data: firestoreItems
          .filter((item) => !cityCode || item.cityCode === cityCode)
          .map(applyConfiguredHousingDiscount),
      };
    }
  } catch (error) {
    console.warn("[housing-inventory] Firestore inventory unavailable", {
      code: error instanceof Error ? error.message : "UNKNOWN",
    });
  }

  try {
    return {
      source: "bootstrap",
      data: listBootstrapHousingInventory(cityCode),
    };
  } catch (error) {
    console.error("[housing-inventory] Bootstrap inventory unavailable", {
      code: error instanceof Error ? error.message : "UNKNOWN",
    });
    return { source: "unavailable", data: [] };
  }
}

export async function getHousingInventorySource(): Promise<HousingInventorySource> {
  return (await resolveHousingInventory()).source;
}

export async function listAvailableHousingResidences(
  cityCode: string,
): Promise<HousingInventoryResult<HousingInventoryItem[]>> {
  const result = await resolveHousingInventory(cityCode);
  return {
    source: result.source,
    data: result.data.filter(isPubliclySelectable),
  };
}

export async function getHousingResidenceById(
  housingInventoryId: string,
  options?: {
    source?: Exclude<HousingInventorySource, "unavailable">;
  },
): Promise<HousingInventoryResult<HousingInventoryItem | null>> {
  if (options?.source !== "bootstrap") {
    try {
      const db = getAdminFirestore();
      const snapshot = await db
        .collection(INVENTORY_COLLECTION)
        .doc(housingInventoryId)
        .get();
      if (snapshot.exists) {
        return {
          source: "firestore",
          data: applyConfiguredHousingDiscount(
            mapHousingInventoryItem(
              snapshot.id,
              snapshot.data() as Record<string, unknown>,
            ),
          ),
        };
      }

      const probe = await db.collection(INVENTORY_COLLECTION).limit(1).get();
      if (probe.docs.length > 0 || options?.source === "firestore") {
        return { source: "firestore", data: null };
      }
    } catch (error) {
      console.warn("[housing-inventory] Firestore residence lookup unavailable", {
        code: error instanceof Error ? error.message : "UNKNOWN",
      });
      if (options?.source === "firestore") {
        return { source: "unavailable", data: null };
      }
    }
  }

  try {
    const bootstrapResidence =
      getBootstrapHousingResidenceById(housingInventoryId);
    return {
      source: "bootstrap",
      data: bootstrapResidence
        ? mapBootstrapHousingInventoryItem(bootstrapResidence)
        : null,
    };
  } catch (error) {
    console.error("[housing-inventory] Bootstrap residence lookup unavailable", {
      code: error instanceof Error ? error.message : "UNKNOWN",
    });
    return { source: "unavailable", data: null };
  }
}

export async function listAvailableHousingCities(): Promise<
  HousingInventoryResult<PublicHousingCity[]>
> {
  const result = await resolveHousingInventory();
  const cities = new Map<
    string,
    PublicHousingCity
  >();
  for (const item of result.data.filter(isPubliclySelectable)) {
    const current = cities.get(item.cityCode);
    const displayedRent = resolveHousingSnapshotRent(item.pricing);
    const minimumRent =
      displayedRent === null
        ? current?.minimumDisplayedRent ?? null
        : current?.minimumDisplayedRent === null ||
            current?.minimumDisplayedRent === undefined
          ? displayedRent
          : Math.min(current.minimumDisplayedRent, displayedRent);
    cities.set(item.cityCode, {
      code: item.cityCode,
      label: item.cityLabel,
      country: "France",
      residenceCount: (current?.residenceCount ?? 0) + 1,
      minimumDisplayedRent: minimumRent,
      currency: "EUR",
      availabilityLabel: "Pré-réservation conditionnelle",
    });
  }
  return {
    source: result.source,
    data: [...cities.values()].sort((a, b) => a.label.localeCompare(b.label, "fr")),
  };
}

export async function listPublicHousingInventory(cityCode?: string | null) {
  if (cityCode) return (await listAvailableHousingResidences(cityCode)).data;
  const result = await resolveHousingInventory();
  return result.data.filter(isPubliclySelectable);
}

export async function listPublicHousingCities() {
  return (await listAvailableHousingCities()).data;
}

export function createHousingSelectionSnapshot({
  inventory,
  inventorySource,
  accommodationType,
  selectedAt,
}: {
  inventory: HousingInventoryItem;
  inventorySource: Exclude<HousingInventorySource, "unavailable">;
  accommodationType: HousingAccommodationType;
  selectedAt: string;
}): HousingSelectionSnapshot {
  return {
    selectedAt,
    inventorySource,
    manualReviewRequired:
      inventorySource === "bootstrap" ||
      inventory.autoIssuance.manualReviewRequired === true,
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
