import { afterEach, describe, expect, it, vi } from "vitest";
import { writeAnalyticsConsent } from "@/lib/analytics/consent";

const posthogMocks = vi.hoisted(() => ({
  capture: vi.fn(),
  identify: vi.fn(),
  init: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: posthogMocks,
}));

async function importPostHogModule() {
  vi.resetModules();

  return import("@/lib/analytics/posthog");
}

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  posthogMocks.capture.mockReset();
  posthogMocks.identify.mockReset();
  posthogMocks.init.mockReset();
  posthogMocks.reset.mockReset();
});

describe("PostHog consent gate", () => {
  it("does not initialize without analytics consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "ph_test");
    const { initPostHog } = await importPostHogModule();

    expect(initPostHog()).toBe(false);
    expect(posthogMocks.init).not.toHaveBeenCalled();
  });

  it("does not initialize when the public key is missing", async () => {
    writeAnalyticsConsent("accepted");
    const { initPostHog } = await importPostHogModule();

    expect(initPostHog()).toBe(false);
    expect(posthogMocks.init).not.toHaveBeenCalled();
  });

  it("initializes when analytics consent is accepted and the key exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "ph_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://posthog.example");
    writeAnalyticsConsent("accepted");
    const { initPostHog } = await importPostHogModule();

    expect(initPostHog()).toBe(true);

    await vi.waitFor(() => {
      expect(posthogMocks.init).toHaveBeenCalledWith(
        "ph_test",
        expect.objectContaining({
          api_host: "https://posthog.example",
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          persistence: "localStorage",
        }),
      );
    });
  });

  it("does not capture events when analytics consent is rejected", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "ph_test");
    writeAnalyticsConsent("rejected");
    const { captureAnalyticsEvent } = await importPostHogModule();

    expect(
      captureAnalyticsEvent("guide_cta_clicked", { origin: "floating_cta" }),
    ).toBe(false);
    expect(posthogMocks.capture).not.toHaveBeenCalled();
  });

  it("captures anonymous events after consent without identifying users", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "ph_test");
    writeAnalyticsConsent("accepted");
    const { captureAnalyticsEvent, identifyAnalyticsUser } =
      await importPostHogModule();

    expect(
      captureAnalyticsEvent("guide_cta_clicked", { origin: "floating_cta" }),
    ).toBe(true);
    expect(identifyAnalyticsUser("firebase-uid")).toBe(false);

    await vi.waitFor(() => {
      expect(posthogMocks.capture).toHaveBeenCalledWith("guide_cta_clicked", {
        origin: "floating_cta",
      });
    });
    expect(posthogMocks.identify).not.toHaveBeenCalled();
  });
});
