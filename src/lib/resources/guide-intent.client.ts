"use client";

import {
  dashboardGuideResourceHref,
  GUIDE_FRANCE_2026_RESOURCE_ID,
  GUIDE_INTENT_STORAGE_KEY,
  isGuideFrance2026Resource,
} from "@/lib/resources/guide-resource";

export function rememberGuideIntent(resource: string | null | undefined) {
  if (typeof window === "undefined" || !isGuideFrance2026Resource(resource)) {
    return;
  }

  window.sessionStorage.setItem(
    GUIDE_INTENT_STORAGE_KEY,
    GUIDE_FRANCE_2026_RESOURCE_ID,
  );
}

export function getRememberedGuideIntent() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.sessionStorage.getItem(GUIDE_INTENT_STORAGE_KEY);
  return isGuideFrance2026Resource(value) ? value : null;
}

export function clearRememberedGuideIntent() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(GUIDE_INTENT_STORAGE_KEY);
}

export function getPostAuthGuideRedirect(defaultPath: string) {
  return getRememberedGuideIntent() ? dashboardGuideResourceHref() : defaultPath;
}

