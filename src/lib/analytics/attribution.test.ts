import { afterEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_ATTRIBUTION_STORAGE_KEY,
  captureAnalyticsAttribution,
  getGuideRequestAttribution,
} from "@/lib/analytics/attribution";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  writeAnalyticsConsent,
} from "@/lib/analytics/consent";

function setLocation(path: string) {
  window.history.pushState({}, "", path);
}

afterEach(() => {
  window.localStorage.removeItem(ANALYTICS_ATTRIBUTION_STORAGE_KEY);
  window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
  Object.defineProperty(document, "referrer", {
    configurable: true,
    value: "",
  });
  setLocation("/");
});

describe("analytics attribution", () => {
  it("captures UTM, referrer, and landing path only after consent", () => {
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://google.example/search",
    });
    setLocation(
      "/?utm_source=google&utm_medium=cpc&utm_campaign=guide&utm_content=hero&utm_term=avi",
    );
    writeAnalyticsConsent("accepted");

    expect(captureAnalyticsAttribution()).toBe(true);

    const stored = JSON.parse(
      String(window.localStorage.getItem(ANALYTICS_ATTRIBUTION_STORAGE_KEY)),
    ) as {
      firstTouch: Record<string, string>;
      lastTouch: Record<string, string>;
    };

    expect(stored.firstTouch).toMatchObject({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "guide",
      utmContent: "hero",
      utmTerm: "avi",
      referrer: "https://google.example/search",
      landingPath:
        "/?utm_source=google&utm_medium=cpc&utm_campaign=guide&utm_content=hero&utm_term=avi",
    });
  });

  it("does not capture or expose attribution when analytics consent is rejected", () => {
    setLocation("/?utm_source=google&utm_medium=cpc&utm_campaign=guide");
    writeAnalyticsConsent("rejected");

    expect(captureAnalyticsAttribution()).toBe(false);
    expect(window.localStorage.getItem(ANALYTICS_ATTRIBUTION_STORAGE_KEY)).toBeNull();
    expect(getGuideRequestAttribution()).toEqual({});
  });

  it("does not invent UTM values for guide requests", () => {
    setLocation("/prix");
    writeAnalyticsConsent("accepted");

    expect(captureAnalyticsAttribution()).toBe(true);
    expect(getGuideRequestAttribution()).toEqual({});
  });

  it("keeps first touch for guide requests while updating last touch", () => {
    writeAnalyticsConsent("accepted");
    setLocation("/?utm_source=google&utm_medium=cpc&utm_campaign=guide");
    expect(captureAnalyticsAttribution()).toBe(true);

    setLocation("/prix?utm_source=linkedin&utm_medium=social&utm_campaign=retargeting");
    expect(captureAnalyticsAttribution()).toBe(true);

    expect(getGuideRequestAttribution()).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "guide",
    });
  });
});
