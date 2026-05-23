import { afterEach, describe, expect, it, vi } from "vitest";

describe("FintechStore production fallback guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows process-local fallback in tests", async () => {
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");
    vi.resetModules();

    const { getFintechStore } = await import("@/lib/fintech/fintech-store");

    await expect(getFintechStore().listSimulations()).resolves.toEqual([]);
  });

  it("forbids process-local fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIREBASE_PROJECT_ID", "");
    vi.stubEnv("FIREBASE_CLIENT_EMAIL", "");
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");
    vi.resetModules();

    const { getFintechStore } = await import("@/lib/fintech/fintech-store");

    await expect(getFintechStore().listSimulations()).rejects.toThrow(
      "Firebase Admin configuration is required for fintech financial storage in production",
    );
  });
});
