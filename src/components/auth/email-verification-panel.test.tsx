import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const panelMocks = vi.hoisted(() => ({
  logout: vi.fn(),
  reloadUser: vi.fn(),
  replace: vi.fn(),
  runPostVerificationTransition: vi.fn(),
  sendVerificationEmail: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: panelMocks.replace }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: panelMocks.useAuth,
}));

vi.mock("@/lib/firebase/auth", () => ({
  runPostVerificationTransition: panelMocks.runPostVerificationTransition,
  sendVerificationEmail: panelMocks.sendVerificationEmail,
}));

vi.mock("@/lib/resources/guide-intent.client", () => ({
  getPostAuthGuideRedirect: (fallback: string) => fallback,
}));

import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";

beforeEach(() => {
  Object.values(panelMocks).forEach((mock) => mock.mockReset());
});

describe("EmailVerificationPanel", () => {
  it("completes the server transition before opening the dashboard", async () => {
    const verifiedUser = {
      uid: "user-1",
      email: "awa@example.com",
      emailVerified: true,
      getIdToken: vi.fn(),
    };
    panelMocks.useAuth.mockReturnValue({
      user: { ...verifiedUser, emailVerified: false },
      loading: false,
      isEmailVerified: false,
      reloadUser: panelMocks.reloadUser,
      logout: panelMocks.logout,
    });
    panelMocks.reloadUser.mockResolvedValue(verifiedUser);
    panelMocks.runPostVerificationTransition.mockResolvedValue(undefined);

    render(<EmailVerificationPanel />);
    await userEvent.click(
      screen.getByRole("button", { name: /j'ai verifie mon email/i }),
    );

    expect(panelMocks.runPostVerificationTransition).toHaveBeenCalledWith(
      verifiedUser,
    );
    expect(panelMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(
      panelMocks.runPostVerificationTransition.mock.invocationCallOrder[0],
    ).toBeLessThan(panelMocks.replace.mock.invocationCallOrder[0]);
  });
});
