import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { AnalyticsConsentBanner } from "@/components/analytics/analytics-consent-banner";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "@/lib/analytics/consent";

afterEach(() => {
  window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
});

describe("AnalyticsConsentBanner", () => {
  it("shows when no analytics consent choice exists", async () => {
    render(<AnalyticsConsentBanner />);

    expect(
      await screen.findByRole("complementary", {
        name: /consentement aux mesures d'audience/i,
      }),
    ).toBeInTheDocument();
  });

  it("stores acceptance and hides the banner", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsentBanner />);

    await user.click(await screen.findByRole("button", { name: /accepter/i }));

    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe(
      "accepted",
    );
    expect(
      screen.queryByRole("complementary", {
        name: /consentement aux mesures d'audience/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("stores refusal and hides the banner", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsentBanner />);

    await user.click(await screen.findByRole("button", { name: /refuser/i }));

    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe(
      "rejected",
    );
    expect(
      screen.queryByRole("complementary", {
        name: /consentement aux mesures d'audience/i,
      }),
    ).not.toBeInTheDocument();
  });
});
