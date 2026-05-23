import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function normalizePrivateKey(value) {
  return value.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function maskEmail(email) {
  const [local, domain] = email.split("@");
  const maskedLocal = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local[0]}***${local.at(-1)}`;

  return `${maskedLocal}@${domain}`;
}

const email = requiredEnv("ADMIN_BOOTSTRAP_EMAIL");
const dryRun = process.env.ADMIN_BOOTSTRAP_DRY_RUN !== "false";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: requiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: normalizePrivateKey(requiredEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const nextClaims = {
  ...(user.customClaims ?? {}),
  admin: true,
  role: "admin",
};

if (dryRun) {
  console.log(
    `DRY RUN: would grant AVI CERTIFY admin claim to ${maskEmail(email)} (uid ${user.uid}). Set ADMIN_BOOTSTRAP_DRY_RUN=false to apply.`,
  );
  process.exit(0);
}

await auth.setCustomUserClaims(user.uid, nextClaims);
console.log(`Granted AVI CERTIFY admin claim to ${maskEmail(email)} (uid ${user.uid}).`);
