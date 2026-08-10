import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loginMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  runPostVerificationTransition: vi.fn(),
  signInWithEmail: vi.fn(),
  trackLoginCompleted: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: loginMocks.replace }),
}));

vi.mock("@/lib/firebase/auth", () => ({
  runPostVerificationTransition: loginMocks.runPostVerificationTransition,
  signInWithEmail: loginMocks.signInWithEmail,
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackLoginCompleted: loginMocks.trackLoginCompleted,
  }),
}));

vi.mock("@/lib/resources/guide-intent.client", () => ({
  getPostAuthGuideRedirect: (fallback: string) => fallback,
  rememberGuideIntent: vi.fn(),
}));

import { LoginForm } from "@/components/auth/login-form";

beforeEach(() => {
  Object.values(loginMocks).forEach((mock) => mock.mockReset());
});

describe("LoginForm verified user transition", () => {
  it("runs post-verification before redirecting a verified user", async () => {
    const verifiedUser = {
      uid: "existing-user-1",
      email: "existing@example.com",
      emailVerified: true,
      getIdToken: vi.fn(),
    };
    loginMocks.signInWithEmail.mockResolvedValue({ user: verifiedUser });
    loginMocks.runPostVerificationTransition.mockResolvedValue(undefined);

    render(<LoginForm />);
    await userEvent.type(
      screen.getByLabelText(/email/i),
      "existing@example.com",
    );
    await userEvent.type(screen.getByLabelText(/^mot de passe$/i), "Password1!");
    await userEvent.click(
      screen.getByRole("button", { name: /se connecter/i }),
    );

    expect(loginMocks.runPostVerificationTransition).toHaveBeenCalledWith(
      verifiedUser,
    );
    expect(loginMocks.replace).toHaveBeenCalledWith("/dashboard");
    expect(
      loginMocks.runPostVerificationTransition.mock.invocationCallOrder[0],
    ).toBeLessThan(loginMocks.replace.mock.invocationCallOrder[0]);
  });
});
