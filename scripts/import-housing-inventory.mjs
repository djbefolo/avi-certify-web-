import path from "node:path";
import process from "node:process";
import ExcelJS from "exceljs";
import { buildImportedHousingPricing } from "../src/lib/housing/housing-pricing-import.ts";

const DEFAULT_WORKBOOK = path.resolve(
  "data/imports/housing/AVI_CERTIFY_housing_inventory_2026-08-03.xlsx",
);
const INVENTORY_SHEET = "Résidences disponibles";
const EXPECTED_HEADERS = [
  "Référence interne",
  "Partenaire commercial",
  "Résidence / opérateur",
  "Zone SafeHouse associée",
  "Commune",
  "Code postal",
  "Adresse exacte",
  "Types de logements affichés",
];

function argumentValue(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function slug(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function text(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text).trim();
  return String(value).trim();
}

function number(cell) {
  return typeof cell.value === "number" && Number.isFinite(cell.value)
    ? cell.value
    : undefined;
}

function date(cell) {
  if (cell.value instanceof Date && !Number.isNaN(cell.value.getTime())) {
    return cell.value;
  }
  if (typeof cell.value === "number") {
    return new Date(Date.UTC(1899, 11, 30) + cell.value * 86_400_000);
  }
  return undefined;
}

function accommodationTypes(value) {
  const result = new Set();
  for (const raw of String(value).split(";")) {
    const item = raw.trim().toLowerCase();
    if (!item) continue;
    if (item === "studio") result.add("studio");
    else if (item.includes("t1 bis")) result.add("t1_bis");
    else if (item.startsWith("t2")) result.add("t2");
    else if (item.includes("colocation")) result.add("shared");
    else result.add("other");
  }
  return [...result];
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefined(item)]),
    );
  }
  return value;
}

async function parseWorkbook(workbookPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.getWorksheet(INVENTORY_SHEET);
  if (!sheet) throw new Error(`Missing worksheet: ${INVENTORY_SHEET}`);

  const actualHeaders = EXPECTED_HEADERS.map((_, index) => text(sheet.getCell(5, index + 1)));
  EXPECTED_HEADERS.forEach((expected, index) => {
    if (actualHeaders[index] !== expected) {
      throw new Error(
        `Unexpected header in ${INVENTORY_SHEET}!${sheet.getCell(5, index + 1).address}: ${actualHeaders[index]}`,
      );
    }
  });

  const items = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 5) return;
    const internalReference = text(row.getCell(1));
    if (!internalReference) return;
    const partnerName = text(row.getCell(2));
    const residenceName = text(row.getCell(3));
    const zoneLabel = text(row.getCell(4));
    const municipality = text(row.getCell(5));
    const postalCode = text(row.getCell(6)).padStart(5, "0");
    const addressLine = text(row.getCell(7));
    const checkedAt = date(row.getCell(15));
    const cityCode = slug(zoneLabel || municipality);
    if (!/^AVI-LOG-FR-\d{4}$/.test(internalReference)) {
      throw new Error(`Invalid inventory reference at row ${rowNumber}`);
    }
    if (!cityCode || !municipality || !postalCode || !addressLine || !residenceName) {
      throw new Error(`Incomplete inventory row ${rowNumber}`);
    }
    items.push({
      id: internalReference,
      internalReference,
      partner: {
        id: slug(partnerName),
        displayName: partnerName,
        operatorName: residenceName.includes("Nemea") ? "Nemea Appart'Etud" : undefined,
      },
      residenceName,
      countryCode: "FR",
      countryName: "France",
      cityCode,
      cityLabel: zoneLabel || municipality,
      zoneLabel: zoneLabel || undefined,
      municipality,
      postalCode,
      address: {
        line1: addressLine,
        postalCode,
        city: municipality,
        country: "France",
        formattedAddress: `${addressLine}, ${postalCode} ${municipality}, France`,
      },
      publicAddress: {
        formattedAddress: `${addressLine}, ${postalCode} ${municipality}, France`,
        displayToClient: false,
      },
      accommodationTypes: accommodationTypes(text(row.getCell(8))),
      sourcePricing: {
        cityIndicativePrice: number(row.getCell(9)),
        residenceDisplayedRent: number(row.getCell(10)),
      },
      source: {
        officialUrl: text(row.getCell(16)) || undefined,
        lastCheckedAt: checkedAt,
        workbookName: path.basename(workbookPath),
        sheetName: INVENTORY_SHEET,
        sourceRow: rowNumber,
      },
      publicDescription: `Résidence étudiante à ${municipality}. Disponibilité conditionnelle à confirmer.`,
      internalNotes: text(row.getCell(17)) || undefined,
    });
  });
  if (items.length !== 42) {
    throw new Error(`Expected 42 inventory rows, received ${items.length}.`);
  }
  return items;
}

async function connectFirestore({ requireApplyConfirmation = false } = {}) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase access blocked: missing FIREBASE_PROJECT_ID.");
  for (const name of ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) {
    if (!process.env[name]) throw new Error(`Firebase access blocked: missing ${name}.`);
  }
  if (requireApplyConfirmation) {
    const expectedProjectId = process.env.HOUSING_IMPORT_CONFIRM_PROJECT_ID;
    const targetEnvironment = process.env.HOUSING_IMPORT_TARGET_ENV;
    if (!expectedProjectId || projectId !== expectedProjectId) {
      throw new Error(
        "Apply blocked: FIREBASE_PROJECT_ID and HOUSING_IMPORT_CONFIRM_PROJECT_ID must exist and match.",
      );
    }
    if (
      targetEnvironment !== "preview" ||
      process.env.HOUSING_IMPORT_CONFIRM_NON_PRODUCTION !== "true" ||
      process.env.VERCEL_ENV === "production"
    ) {
      throw new Error(
        "Apply blocked: target must be an explicitly confirmed non-production Preview environment.",
      );
    }
  }

  const [{ cert, getApps, initializeApp }, { getFirestore, Timestamp }] =
    await Promise.all([import("firebase-admin/app"), import("firebase-admin/firestore")]);
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      }),
    });
  return { db: getFirestore(app), projectId, Timestamp };
}

async function planImport(items) {
  const { db, projectId } = await connectFirestore();
  const snapshots = await db.getAll(
    ...items.map((item) => db.collection("housing_inventory").doc(item.id)),
  );
  const updated = snapshots.filter((snapshot) => snapshot.exists).length;
  return {
    projectId,
    targetEnvironment: process.env.HOUSING_IMPORT_TARGET_ENV ?? "unconfirmed",
    nonProductionConfirmed:
      process.env.HOUSING_IMPORT_CONFIRM_NON_PRODUCTION === "true",
    created: items.length - updated,
    updated,
    total: items.length,
    collectionsAffected: ["housing_inventory", "housing_import_batches"],
    writePerformed: false,
  };
}

async function applyImport(items, workbookPath) {
  const { db, projectId, Timestamp } = await connectFirestore({
    requireApplyConfirmation: true,
  });
  const importedAt = new Date();
  const batchId = `housing_${importedAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
  const batchRef = db.collection("housing_import_batches").doc(batchId);
  const writeBatch = db.batch();
  let created = 0;
  let updated = 0;

  writeBatch.set(batchRef, {
    id: batchId,
    status: "processing",
    workbookName: path.basename(workbookPath),
    projectId,
    itemCount: items.length,
    createdAt: Timestamp.fromDate(importedAt),
    autoIssuanceEnabledByImport: false,
  });

  for (const item of items) {
    const ref = db.collection("housing_inventory").doc(item.id);
    const existingSnapshot = await ref.get();
    const existing = existingSnapshot.exists ? existingSnapshot.data() : null;
    if (existingSnapshot.exists) updated += 1;
    else created += 1;
    const pricing = buildImportedHousingPricing({
      inventoryId: item.id,
      sourcePricing: item.sourcePricing,
      existingPricing: existing?.pricing,
    });
    const source = {
      ...item.source,
      lastCheckedAt: item.source.lastCheckedAt
        ? Timestamp.fromDate(item.source.lastCheckedAt)
        : undefined,
      importBatchId: batchId,
    };
    const createdAt = existing?.createdAt ?? Timestamp.fromDate(importedAt);
    const coreItem = { ...item };
    delete coreItem.sourcePricing;
    const publicAddress = {
      formattedAddress:
        existing?.publicAddress?.formattedAddress ?? coreItem.publicAddress.formattedAddress,
      displayToClient: existing?.publicAddress?.displayToClient === true,
      ...(existing?.publicAddress?.validatedAt
        ? { validatedAt: existing.publicAddress.validatedAt }
        : {}),
      ...(existing?.publicAddress?.validatedByAdminUid
        ? { validatedByAdminUid: existing.publicAddress.validatedByAdminUid }
        : {}),
    };
    writeBatch.set(
      ref,
      stripUndefined({
        ...coreItem,
        publicAddress,
        pricing,
        inventoryStatus: existing?.inventoryStatus ?? "confirmation_required",
        availabilityGuaranteed: false,
        autoIssuance: existing?.autoIssuance ?? {
          enabled: false,
          eligibilityStatus: "manual_review_only",
          manualReviewRequired: true,
          stopReason: "Imported inventory requires explicit admin prevalidation.",
        },
        availability: existing?.availability ?? {},
        isVisibleToClients: existing?.isVisibleToClients ?? true,
        isEligibleForCertificate: existing?.isEligibleForCertificate ?? false,
        source,
        version: (existing?.version ?? 0) + 1,
        createdAt,
        updatedAt: Timestamp.fromDate(importedAt),
      }),
      { merge: false },
    );
  }

  writeBatch.update(batchRef, {
    status: "completed",
    created,
    updated,
    completedAt: Timestamp.fromDate(new Date()),
  });
  await writeBatch.commit();
  return { batchId, projectId, created, updated, total: items.length };
}

const workbookPath = path.resolve(argumentValue("--file") ?? DEFAULT_WORKBOOK);
const apply = process.argv.includes("--apply");
const plan = process.argv.includes("--plan");
if (apply && plan) throw new Error("Use either --plan or --apply, not both.");
const items = await parseWorkbook(workbookPath);

if (plan) {
  console.log(JSON.stringify({ mode: "plan", ...(await planImport(items)) }, null, 2));
} else if (!apply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        workbook: path.basename(workbookPath),
        rows: items.length,
        cities: new Set(items.map((item) => item.cityCode)).size,
        autoIssuanceEnabledByImport: false,
        publicAddressesDisplayedByImport: items.filter(
          (item) => item.publicAddress.displayToClient,
        ).length,
        nextStep:
          "Use --plan with Preview Firebase Admin variables before requesting approval for --apply.",
      },
      null,
      2,
    ),
  );
} else {
  console.log(JSON.stringify({ mode: "apply", ...(await applyImport(items, workbookPath)) }, null, 2));
}
