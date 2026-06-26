export const ANALYTICS_CONSENT_STORAGE_KEY = "avi_analytics_consent";
export const ANALYTICS_CONSENT_CHANGED_EVENT = "avi:analytics-consent-changed";

export type AnalyticsConsentChoice = "accepted" | "rejected";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isAnalyticsConsentChoice(
  value: string | null,
): value is AnalyticsConsentChoice {
  return value === "accepted" || value === "rejected";
}

export function readAnalyticsConsent(
  storageKey = ANALYTICS_CONSENT_STORAGE_KEY,
): AnalyticsConsentChoice | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(storageKey);

    return isAnalyticsConsentChoice(value) ? value : null;
  } catch {
    return null;
  }
}

export function hasAcceptedAnalyticsConsent(
  storageKey = ANALYTICS_CONSENT_STORAGE_KEY,
) {
  return readAnalyticsConsent(storageKey) === "accepted";
}

export function writeAnalyticsConsent(
  choice: AnalyticsConsentChoice,
  storageKey = ANALYTICS_CONSENT_STORAGE_KEY,
) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(storageKey, choice);
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, {
        detail: { choice },
      }),
    );

    return true;
  } catch {
    return false;
  }
}
