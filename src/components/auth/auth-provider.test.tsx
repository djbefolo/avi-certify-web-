import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useAuth } from "@/hooks/use-auth";
import { clearAdminSession, observeAuthState, signOutUser } from "@/lib/firebase/auth";

vi.mock("@/lib/firebase/auth", () => ({
  clearAdminSession: vi.fn(),
  observeAuthState: vi.fn(),
  signOutUser: vi.fn(),
}));

function LogoutProbe() {
  const { logout } = useAuth();

  return (
    <button type="button" onClick={() => void logout().catch(() => undefined)}>
      Logout
    </button>
  );
}

describe("AuthProvider admin-session isolation", () => {
  beforeEach(() => {
    vi.mocked(observeAuthState).mockReset();
    vi.mocked(clearAdminSession).mockReset();
    vi.mocked(signOutUser).mockReset();
    vi.mocked(observeAuthState).mockImplementation((callback) => {
      callback(null);

      return vi.fn();
    });
    vi.mocked(clearAdminSession).mockResolvedValue(undefined);
    vi.mocked(signOutUser).mockResolvedValue(undefined);
  });

  it("public logout clears the admin session before Firebase client sign-out", async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(clearAdminSession).toHaveBeenCalledTimes(1);
      expect(signOutUser).toHaveBeenCalledTimes(1);
    });
  });

  it("still signs out Firebase when clearing the server session fails", async () => {
    const user = userEvent.setup();
    vi.mocked(clearAdminSession).mockRejectedValueOnce(
      new Error("Admin session logout failed."),
    );

    render(
      <AuthProvider>
        <LogoutProbe />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(clearAdminSession).toHaveBeenCalledTimes(1);
      expect(signOutUser).toHaveBeenCalledTimes(1);
    });
  });

  it("renders children instead of crashing when Firebase client auth is unavailable", () => {
    vi.mocked(observeAuthState).mockImplementationOnce(() => {
      throw new Error("Firebase client config is missing.");
    });

    render(
      <AuthProvider>
        <div>Admin login can render</div>
      </AuthProvider>,
    );

    expect(screen.getByText("Admin login can render")).toBeInTheDocument();
  });
});
