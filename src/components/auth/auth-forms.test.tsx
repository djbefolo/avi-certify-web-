import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

vi.mock("@/lib/firebase/auth", () => ({
  clearAdminSession: vi.fn(),
  observeAuthState: vi.fn(),
  sendPasswordReset: vi.fn(),
  sendVerificationEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signOutUser: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackLoginCompleted: vi.fn(),
    trackSignupCompleted: vi.fn(),
    trackSignupStarted: vi.fn(),
  }),
}));

describe("auth forms", () => {
  it("renders the login fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /se connecter/i }),
    ).toBeInTheDocument();
  });

  it("renders the registration fields", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nom$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pays de naissance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
  });
});
