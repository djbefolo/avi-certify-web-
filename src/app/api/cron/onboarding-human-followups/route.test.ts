import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  processOnboardingHumanFollowUps: vi.fn(),
}));

vi.mock("@/lib/server/onboarding-human-followup.service", () => ({
  processOnboardingHumanFollowUps:
    cronMocks.processOnboardingHumanFollowUps,
}));

import { GET } from "@/app/api/cron/onboarding-human-followups/route";

function request(authorization?: string) {
  return new NextRequest(
    "http://localhost/api/cron/onboarding-human-followups",
    {
      method: "GET",
      headers: authorization ? { Authorization: authorization } : undefined,
    },
  );
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  cronMocks.processOnboardingHumanFollowUps.mockReset();
  cronMocks.processOnboardingHumanFollowUps.mockResolvedValue({
    due: 1,
    processed: 1,
    escalated: 1,
    reviewRequired: 0,
    resolved: 0,
    cancelled: 0,
    skipped: 0,
    failed: 0,
  });
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("GET /api/cron/onboarding-human-followups", () => {
  it("fails closed with 503 when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(cronMocks.processOnboardingHumanFollowUps).not.toHaveBeenCalled();
  });

  it("rejects a public request without credentials", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(cronMocks.processOnboardingHumanFollowUps).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer secret", async () => {
    const response = await GET(request("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(cronMocks.processOnboardingHumanFollowUps).not.toHaveBeenCalled();
  });

  it("runs once for the exact Vercel bearer secret", async () => {
    const response = await GET(request("Bearer test-cron-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      processed: 1,
      escalated: 1,
    });
    expect(cronMocks.processOnboardingHumanFollowUps).toHaveBeenCalledTimes(1);
  });

  it("returns a sanitized 500 without leaking worker details", async () => {
    cronMocks.processOnboardingHumanFollowUps.mockRejectedValueOnce(
      Object.assign(new Error("private detail"), { code: "WORKER_FAILED" }),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET(request("Bearer test-cron-secret"));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Le traitement des suivis humains a echoue." });
    expect(JSON.stringify(body)).not.toContain("private detail");
    error.mockRestore();
  });
});
