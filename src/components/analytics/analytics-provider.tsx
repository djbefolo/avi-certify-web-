"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AnalyticsConsentBanner } from "@/components/analytics/analytics-consent-banner";
import {
  captureAnalyticsEvent,
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

function getSafeCurrentPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname;
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

    const path = getSafeCurrentPath();

    if (!path || lastTrackedPath === path) {
      return;
    }

    captureAnalyticsAttribution();
    initPostHog();
    lastTrackedPath = path;
    captureAnalyticsEvent("page_view", {
      path,
    });
  }, [consent, pathname]);

  return (
    <>
      {children}
      <AnalyticsConsentBanner />
    </>
  );
}
