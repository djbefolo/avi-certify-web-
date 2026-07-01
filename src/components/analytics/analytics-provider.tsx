"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnalyticsConsentBanner } from "@/components/analytics/analytics-consent-banner";
import {
  capturePageView,
  initPostHog,
} from "@/lib/analytics/posthog";
import { captureAnalyticsAttribution } from "@/lib/analytics/attribution";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  readAnalyticsConsent,
  type AnalyticsConsentChoice,
} from "@/lib/analytics/consent";

type AnalyticsProviderProps = {
  children: ReactNode;
};

let lastTrackedPath: string | null = null;
const excludedPageviewPrefixes = [
  "/admin",
  "/api",
  "/dashboard",
  "/dossier",
  "/profil",
  "/verifier",
];

function getSafeCurrentLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const { pathname, search, href } = window.location;

  if (
    excludedPageviewPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return null;
  }

  return {
    path: `${pathname}${search}`,
    pathname,
    search: search || undefined,
    url: href,
    referrer: document.referrer || undefined,
    title: document.title || undefined,
  };
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsentChoice | null>(null);

  useEffect(() => {
    const syncConsent = () => {
      setConsent(readAnalyticsConsent());
    };

    syncConsent();

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  useEffect(() => {
    if (consent !== "accepted") {
      return;
    }

    const location = getSafeCurrentLocation();

    if (!location || lastTrackedPath === location.path) {
      return;
    }

    captureAnalyticsAttribution();
    initPostHog();
    lastTrackedPath = location.path;
    capturePageView(location);
  }, [consent, pathname]);

  return (
    <>
      {children}
      <AnalyticsConsentBanner />
    </>
  );
}
