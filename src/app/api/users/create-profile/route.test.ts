import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createUserProfile: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendWelcomeEmailWithResult: vi.fn(),
  validateUserProfile: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken: routeMocks.verifyIdToken }),
}));

vi.mock("@/lib/server/users.service", () => ({
  createUserProfile: routeMocks.createUserProfile,
  validateUserProfile: routeMocks.validateUserProfile,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendWelcomeEmail: routeMocks.sendWelcomeEmail,
  sendWelcomeEmailWithResult: routeMocks.sendWelcomeEmailWithResult,
}));

import { POST } from "@/app/api/users/create-profile/route";

beforeEach(() => {
  Object.values(routeMocks).forEach((mock) => mock.mockReset());
});

describe("POST /api/users/create-profile", () => {
  it("creates the signup profile without sending a welcome before verification", async () => {
    const profile = {
      uid: "user-1",
      email: "awa@example.com",
      firstName: "Awa",
      lastName: "Ndiaye",
      birthDate: "2000-01-01",
      birthCountry: "Sénégal",
      phone: undefined,
    };
    routeMocks.verifyIdToken.mockResolvedValue({
      uid: profile.uid,
      email: profile.email,
      email_verified: false,
    });
    routeMocks.validateUserProfile.mockReturnValue(profile);
    routeMocks.createUserProfile.mockResolvedValue({
      id: profile.uid,
      created: true,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/users/create-profile", {
        method: "POST",
        headers: {
          Authorization: "Bearer signup-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          birthDate: profile.birthDate,
          birthCountry: profile.birthCountry,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(routeMocks.createUserProfile).toHaveBeenCalledWith(profile);
    expect(routeMocks.sendWelcomeEmail).not.toHaveBeenCalled();
    expect(routeMocks.sendWelcomeEmailWithResult).not.toHaveBeenCalled();
  });
});
