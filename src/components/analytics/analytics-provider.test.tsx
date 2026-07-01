import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

const navigationState = vi.hoisted(() => ({
  pathname: "/",
}));

const analyticsMocks = vi.hoisted(() => ({
  captureAnalyticsAttribution: vi.fn(),
  capturePageView: vi.fn(() => true),
  initPostHog: vi.fn(() => true),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock("@/lib/analytics/attribution", () => ({
  captureAnalyticsAttribution: analyticsMocks.captureAnalyticsAttribution,
}));

vi.mock("@/lib/analytics/posthog", () => ({
  capturePageView: analyticsMocks.capturePageView,
  initPostHog: analyticsMocks.initPostHog,
}));

function renderAt(path: string) {
  navigationState.pathname = path.split("?")[0] || "/";
  window.history.pushState({}, "", path);

  render(
    <AnalyticsProvider>
      <div>Marketing page</div>
    </AnalyticsProvider>,
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
  navigationState.pathname = "/";
  analyticsMocks.captureAnalyticsAttribution.mockReset();
  analyticsMocks.capturePageView.mockReset();
  analyticsMocks.initPostHog.mockReset();
});

describe("AnalyticsProvider", () => {
  it("captures a PostHog pageview after analytics consent is accepted", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");

    renderAt("/prix?utm_source=google");

    expect(await screen.findByText("Marketing page")).toBeInTheDocument();
    await waitFor(() => {
      expect(analyticsMocks.initPostHog).toHaveBeenCalled();
      expect(analyticsMocks.captureAnalyticsAttribution).toHaveBeenCalled();
      expect(analyticsMocks.capturePageView).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/prix?utm_source=google",
          pathname: "/prix",
          search: "?utm_source=google",
          url: expect.stringContaining("/prix?utm_source=google"),
        }),
      );
    });
  });

  it("does not capture pageviews when analytics consent is rejected", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "rejected");

    renderAt("/contact");

    expect(await screen.findByText("Marketing page")).toBeInTheDocument();
    expect(analyticsMocks.initPostHog).not.toHaveBeenCalled();
    expect(analyticsMocks.capturePageView).not.toHaveBeenCalled();
  });

  it("does not capture private or admin routes", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");

    renderAt("/admin");

    expect(await screen.findByText("Marketing page")).toBeInTheDocument();
    expect(analyticsMocks.initPostHog).not.toHaveBeenCalled();
    expect(analyticsMocks.capturePageView).not.toHaveBeenCalled();
  });
});
