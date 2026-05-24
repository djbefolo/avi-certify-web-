export type AdminSessionGuardPayload = {
  uid: string;
  role: "admin" | "super_admin";
  exp: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(input: string | Uint8Array) {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary =
    typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("binary");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.FIREBASE_PRIVATE_KEY ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    ""
  );
}

async function sign(value: string) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("Admin session signing secret is not configured.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return base64UrlEncode(new Uint8Array(signature));
}

export async function createAdminGuardValue(payload: AdminSessionGuardPayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminGuardValue(
  value: string | undefined,
): Promise<AdminSessionGuardPayload | null> {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  try {
    const expectedSignature = await sign(encodedPayload);

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionGuardPayload;

    if (
      !payload.uid ||
      (payload.role !== "admin" && payload.role !== "super_admin") ||
      payload.exp <= Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
