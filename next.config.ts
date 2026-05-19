import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

function getCspOrigin(value: string | undefined, fallback: string) {
  try {
    return new URL(value?.trim() || fallback).origin;
  } catch {
    return fallback;
  }
}

function buildContentSecurityPolicy() {
  const postHogOrigin = getCspOrigin(
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
    "https://eu.i.posthog.com",
  );

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app",
    [
      "connect-src 'self'",
      postHogOrigin,
      "https://*.posthog.com",
      "https://*.i.posthog.com",
      "https://*.googleapis.com",
      "https://*.firebaseio.com",
      "wss://*.firebaseio.com",
      "https://firebasestorage.googleapis.com",
      "https://storage.googleapis.com",
      "https://*.firebasestorage.app",
    ].join(" "),
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const baseSecurityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
];

const productionSecurityHeaders = isProduction
  ? [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(),
      },
    ]
  : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...baseSecurityHeaders, ...productionSecurityHeaders],
      },
    ];
  },
};

export default nextConfig;
