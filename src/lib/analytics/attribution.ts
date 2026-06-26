import { hasAcceptedAnalyticsConsent } from "@/lib/analytics/consent";

export const ANALYTICS_ATTRIBUTION_STORAGE_KEY = "avi_analytics_attribution";

export type AnalyticsAttributionTouch = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPath?: string;
  capturedAt: string;
};

type StoredAnalyticsAttribution = {
  firstTouch: AnalyticsAttributionTouch;
  lastTouch: AnalyticsAttributionTouch;
};

export type GuideRequestAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
};

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function cleanText(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();

  return cleaned || undefined;
}

function addTouchIfPresent(
  target: AnalyticsAttributionTouch,
  key: Exclude<keyof AnalyticsAttributionTouch, "capturedAt">,
  value: string | undefined,
) {
  if (value) {
    target[key] = value;
  }
}

function addGuideAttributionIfPresent(
  target: GuideRequestAttribution,
  key: keyof GuideRequestAttribution,
  value: string | undefined,
) {
  if (value) {
    target[key] = value;
  }
}

function readStoredAttribution(
  storageKey = ANALYTICS_ATTRIBUTION_STORAGE_KEY,
): StoredAnalyticsAttribution | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const value = JSON.parse(rawValue) as Partial<StoredAnalyticsAttribution>;

    if (!value.firstTouch || !value.lastTouch) {
      return null;
    }

    return value as StoredAnalyticsAttribution;
  } catch {
    return null;
  }
}

function writeStoredAttribution(
  attribution: StoredAnalyticsAttribution,
  storageKey = ANALYTICS_ATTRIBUTION_STORAGE_KEY,
) {
  if (!canUseBrowserStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(attribution));

    return true;
  } catch {
    return false;
  }
}

function buildCurrentTouch(): AnalyticsAttributionTouch {
  const searchParams = new URLSearchParams(window.location.search);
  const touch: AnalyticsAttributionTouch = {
    capturedAt: new Date().toISOString(),
  };

  addTouchIfPresent(touch, "utmSource", cleanText(searchParams.get("utm_source")));
  addTouchIfPresent(touch, "utmMedium", cleanText(searchParams.get("utm_medium")));
  addTouchIfPresent(
    touch,
    "utmCampaign",
    cleanText(searchParams.get("utm_campaign")),
  );
  addTouchIfPresent(touch, "utmContent", cleanText(searchParams.get("utm_content")));
  addTouchIfPresent(touch, "utmTerm", cleanText(searchParams.get("utm_term")));
  addTouchIfPresent(touch, "referrer", cleanText(document.referrer));
  addTouchIfPresent(
    touch,
    "landingPath",
    `${window.location.pathname}${window.location.search}`,
  );

  return touch;
}

export function captureAnalyticsAttribution(
  storageKey = ANALYTICS_ATTRIBUTION_STORAGE_KEY,
) {
  if (!hasAcceptedAnalyticsConsent() || typeof window === "undefined") {
    return false;
  }

  const currentTouch = buildCurrentTouch();
  const storedAttribution = readStoredAttribution(storageKey);

  return writeStoredAttribution(
    {
      firstTouch: storedAttribution?.firstTouch ?? currentTouch,
      lastTouch: currentTouch,
    },
    storageKey,
  );
}

export function getGuideRequestAttribution(
  storageKey = ANALYTICS_ATTRIBUTION_STORAGE_KEY,
): GuideRequestAttribution {
  if (!hasAcceptedAnalyticsConsent()) {
    return {};
  }

  const storedAttribution = readStoredAttribution(storageKey);
  const touch = storedAttribution?.firstTouch ?? storedAttribution?.lastTouch;

  if (!touch) {
    return {};
  }

  const attribution: GuideRequestAttribution = {};

  addGuideAttributionIfPresent(attribution, "utmSource", touch.utmSource);
  addGuideAttributionIfPresent(attribution, "utmMedium", touch.utmMedium);
  addGuideAttributionIfPresent(attribution, "utmCampaign", touch.utmCampaign);
  addGuideAttributionIfPresent(attribution, "referrer", touch.referrer);

  return attribution;
}
