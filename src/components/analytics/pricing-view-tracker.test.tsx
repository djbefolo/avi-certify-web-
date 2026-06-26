import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PricingViewTracker } from "@/components/analytics/pricing-view-tracker";

const analyticsMocks = vi.hoisted(() => ({
  trackPricingViewed: vi.fn(),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => analyticsMocks,
}));

afterEach(() => {
  analyticsMocks.trackPricingViewed.mockReset();
});

describe("PricingViewTracker", () => {
  it("tracks the pricing page view with a path only", () => {
    render(<PricingViewTracker />);

    expect(analyticsMocks.trackPricingViewed).toHaveBeenCalledWith("/prix");
  });
});
