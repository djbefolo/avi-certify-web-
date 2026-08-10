import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { planHousingPartnerDiscountMigration } from "../src/lib/housing/housing-pricing-migration.ts";

const COLLECTION = "housing_inventory";
const EXPECTED_RESIDENCE_COUNT = 42;
const allowedEnvironments = new Set(["preview", "production"]);

function argumentValue(name) {
  const prefix = `${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function requireRuntimeConfiguration({ apply, environment }) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase access blocked: Preview/Production Admin credentials are missing.");
  }
  if (!allowedEnvironments.has(environment)) {
    throw new Error("Migration blocked: --environment=preview|production is required.");
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== environment) {
    throw new Error("Migration blocked: VERCEL_ENV does not match the requested environment.");
  }
  if (environment === "preview") {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    if (branch && branch !== "fix/housing-partner-discount-pricing") {
      throw new Error("Migration blocked: Preview branch mismatch.");
    }
  }
  if (environment === "production") {
    const branch = process.env.VERCEL_GIT_COMMIT_REF;
    if (branch && branch !== "main") {
      throw new Error("Migration blocked: Production must execute from main.");
    }
  }
  if (apply) {
    if (
      process.env.HOUSING_PRICING_MIGRATION_CONFIRM_WRITE !== "true" ||
      process.env.HOUSING_PRICING_MIGRATION_CONFIRM_PROJECT_ID !== projectId ||
      process.env.HOUSING_PRICING_MIGRATION_CONFIRM_ENV !== environment
    ) {
      throw new Error("Migration write blocked: explicit project and environment confirmation required.");
    }
  }
  return { projectId, clientEmail, privateKey };
}

function connectFirestore(configuration) {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: configuration.projectId,
        clientEmail: configuration.clientEmail,
        privateKey: configuration.privateKey.replace(/^"|"$/g, "").replace(/\\n/g, "\n"),
      }),
    });
  return getFirestore(app);
}

function summarize(projectId, environment, plans, writePerformed) {
  const anomalies = plans.filter((plan) => plan.status === "anomaly");
  const changed = plans.filter((plan) => plan.status === "migrate");
  const unchanged = plans.filter((plan) => plan.status === "unchanged");
  return {
    projectId,
    environment,
    collection: COLLECTION,
    residences: plans.length,
    toMigrate: changed.length,
    alreadyMigrated: unchanged.length,
    anomalies: anomalies.map(({ inventoryId, code }) => ({ inventoryId, code })),
    examples: [...changed, ...unchanged].slice(0, 10).map((plan) => ({
      inventoryId: plan.inventoryId,
      partnerMonthlyRent: plan.partnerMonthlyRent,
      discountBasisPoints: plan.discountBasisPoints,
      clientMonthlyRent: plan.clientMonthlyRent,
      pricingVersion: plan.pricingVersion,
    })),
    writePerformed,
  };
}

const apply = process.argv.includes("--apply");
const environment = argumentValue("--environment");
const configuration = requireRuntimeConfiguration({ apply, environment });
const db = connectFirestore(configuration);

if (!apply) {
  const snapshot = await db.collection(COLLECTION).get();
  if (snapshot.size !== EXPECTED_RESIDENCE_COUNT) {
    throw new Error(
      `Migration blocked: expected ${EXPECTED_RESIDENCE_COUNT} residences, received ${snapshot.size}.`,
    );
  }
  const plans = snapshot.docs.map((document) =>
    planHousingPartnerDiscountMigration(document.id, document.get("pricing") ?? {}),
  );
  console.log(JSON.stringify(summarize(configuration.projectId, environment, plans, false), null, 2));
} else {
  const result = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(db.collection(COLLECTION));
    if (snapshot.size !== EXPECTED_RESIDENCE_COUNT) {
      throw new Error(
        `Migration blocked: expected ${EXPECTED_RESIDENCE_COUNT} residences, received ${snapshot.size}.`,
      );
    }
    const plans = snapshot.docs.map((document) =>
      planHousingPartnerDiscountMigration(document.id, document.get("pricing") ?? {}),
    );
    const anomalies = plans.filter((plan) => plan.status === "anomaly");
    if (anomalies.length > 0) {
      throw new Error(`Migration blocked: ${anomalies.length} pricing anomalies detected.`);
    }
    const timestamp = Timestamp.now();
    for (const plan of plans) {
      if (plan.status !== "migrate") continue;
      const document = snapshot.docs.find((item) => item.id === plan.inventoryId);
      transaction.set(
        document.ref,
        {
          pricing: plan.nextPricing,
          version: Number(document.get("version") ?? 0) + 1,
          updatedAt: timestamp,
        },
        { merge: true },
      );
    }
    return plans;
  });
  console.log(JSON.stringify(summarize(configuration.projectId, environment, result, true), null, 2));
}
