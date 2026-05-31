export const GUIDE_FRANCE_2026_RESOURCE_ID = "guide-france-2026";
export const GUIDE_FRANCE_2026_STORAGE_PATH =
  "marketing/guides/guide-2026-installation-france.pdf";
export const GUIDE_INTENT_STORAGE_KEY = "avi-certify:resource-intent";

export function isGuideFrance2026Resource(value: string | null | undefined) {
  return value === GUIDE_FRANCE_2026_RESOURCE_ID;
}

export function dashboardGuideResourceHref() {
  return `/dashboard?resource=${GUIDE_FRANCE_2026_RESOURCE_ID}`;
}

