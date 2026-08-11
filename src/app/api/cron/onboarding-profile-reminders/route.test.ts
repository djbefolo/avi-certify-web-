import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  processDueProfileReminders: vi.fn(),
}));

vi.mock("@/lib/server/onboarding-profile-reminder.service", () => ({
  processDueProfileReminders: cronMocks.processDueProfileReminders,
}));

import { GET } from "@/app/api/cron/onboarding-profile-reminders/route";

function request(authorization?: string) {
  return new NextRequest(
    "http://localhost/api/cron/onboarding-profile-reminders",
    {
      method: "GET",
      headers: authorization ? { Authorization: authorization } : undefined,
    },
  );
}

const originalSecret = process.env.CRON_SECRET;

beforeEach(() => {
  cronMocks.processDueProfileReminders.mockReset();
  cronMocks.processDueProfileReminders.mockResolvedValue({
    eligible: 1,
    processed: 1,
    sent: 1,
    failed: 0,
    skipped: 0,
    cancelled: 0,
  });
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalSecret;
  }
});

describe("GET /api/cron/onboarding-profile-reminders", () => {
  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(cronMocks.processDueProfileReminders).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized public invocation", async () => {
    const response = await GET(request("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(cronMocks.processDueProfileReminders).not.toHaveBeenCalled();
  });

  it("runs the worker for the exact Vercel bearer secret", async () => {
    const response = await GET(request("Bearer test-cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      eligible: 1,
      processed: 1,
      sent: 1,
      failed: 0,
      skipped: 0,
      cancelled: 0,
    });
    expect(cronMocks.processDueProfileReminders).toHaveBeenCalledTimes(1);
  });

  it("returns a sanitized failure without leaking worker details", async () => {
    cronMocks.processDueProfileReminders.mockRejectedValueOnce(
      Object.assign(new Error("sensitive provider detail"), {
        code: "WORKER_FAILED",
      }),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request("Bearer test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Le traitement des relances a echoue." });
    expect(JSON.stringify(body)).not.toContain("sensitive provider detail");
    error.mockRestore();
  });
});
