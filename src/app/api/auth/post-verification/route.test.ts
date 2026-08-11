import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  completePostVerification: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken: routeMocks.verifyIdToken }),
}));

vi.mock("@/lib/server/onboarding.service", () => ({
  completePostVerification: routeMocks.completePostVerification,
}));

import { POST } from "@/app/api/auth/post-verification/route";

function request(token?: string) {
  return new NextRequest("http://localhost/api/auth/post-verification", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

beforeEach(() => {
  routeMocks.completePostVerification.mockReset();
  routeMocks.verifyIdToken.mockReset();
});

describe("POST /api/auth/post-verification", () => {
  it("requires an authenticated user", async () => {
    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(routeMocks.verifyIdToken).not.toHaveBeenCalled();
  });

  it("rejects an unverified Firebase token without starting the transition", async () => {
    routeMocks.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "awa@example.com",
      email_verified: false,
    });

    const response = await POST(request("unverified-token"));

    expect(response.status).toBe(403);
    expect(routeMocks.completePostVerification).not.toHaveBeenCalled();
  });

  it("uses the verified token UID and email as canonical identity", async () => {
    routeMocks.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      email: "AWA@EXAMPLE.COM",
      email_verified: true,
    });
    routeMocks.completePostVerification.mockResolvedValue({
      uid: "user-1",
      profileRecovered: false,
      emailVerifiedTransitionCreated: true,
      welcomeStatus: "SENT",
      welcomeSent: true,
      leadLinkStatus: "NO_MATCH",
    });

    const response = await POST(request("verified-token"));

    expect(response.status).toBe(200);
    expect(routeMocks.completePostVerification).toHaveBeenCalledWith({
      uid: "user-1",
      email: "AWA@EXAMPLE.COM",
      emailVerified: true,
    });
    await expect(response.json()).resolves.toMatchObject({
      emailVerifiedTransitionCreated: true,
      welcomeStatus: "SENT",
    });
  });
});
