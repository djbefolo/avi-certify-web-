import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingCta } from "@/components/navigation/floating-cta";

const analyticsMocks = vi.hoisted(() => ({
  trackWhatsAppCtaClicked: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
  }),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => analyticsMocks,
}));

afterEach(() => {
  analyticsMocks.trackWhatsAppCtaClicked.mockReset();
});

describe("FloatingCta analytics", () => {
  it("tracks the WhatsApp CTA click without personal data", () => {
    render(<FloatingCta />);

    fireEvent.click(screen.getByRole("link", { name: /nous contacter/i }));

    expect(analyticsMocks.trackWhatsAppCtaClicked).toHaveBeenCalledWith(
      "floating_cta",
    );
  });
});
