import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingGuideCta } from "@/components/guide/floating-guide-cta";

const TEST_STORAGE_KEY = "avi-guide-cta-test-dismissed-at";

function advanceGuideCtaTimer(delayMs: number) {
  act(() => {
    vi.advanceTimersByTime(delayMs);
  });
}

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.removeItem(TEST_STORAGE_KEY);
});

describe("FloatingGuideCta", () => {
  it("does not show immediately and appears after the default delay", () => {
    vi.useFakeTimers();

    render(<FloatingGuideCta storageKey={TEST_STORAGE_KEY} />);

    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();

    advanceGuideCtaTimer(119_999);

    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();

    advanceGuideCtaTimer(1);

    expect(
      screen.getByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).toBeInTheDocument();
  });

  it("opens and closes the guide request modal", () => {
    vi.useFakeTimers();

    render(<FloatingGuideCta delayMs={500} storageKey={TEST_STORAGE_KEY} />);

    expect(screen.queryByText(/guide 2026 gratuit/i)).not.toBeInTheDocument();

    advanceGuideCtaTimer(500);

    expect(screen.getByText(/guide 2026 gratuit/i)).toBeInTheDocument();
    expect(screen.getByText(/erreurs/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    );

    expect(
      screen.getByRole("dialog", { name: /installation en france/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fermer la fenetre guide/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();
  });

  it("does not reappear immediately after the CTA is dismissed", () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <FloatingGuideCta delayMs={500} storageKey={TEST_STORAGE_KEY} />,
    );

    advanceGuideCtaTimer(500);

    fireEvent.click(screen.getByRole("button", { name: /masquer le cta guide/i }));

    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();

    advanceGuideCtaTimer(2_000);

    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();

    unmount();
    render(<FloatingGuideCta delayMs={500} storageKey={TEST_STORAGE_KEY} />);
    advanceGuideCtaTimer(500);

    expect(
      screen.queryByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    ).not.toBeInTheDocument();
  });
});
