import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

const replace = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const signInWithEmailAndPassword = vi.hoisted(() => vi.fn());
const getIdToken = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();

  return {
    ...actual,
    useRouter: () => ({ replace, refresh }),
    useSearchParams: () => new URLSearchParams("next=/admin"),
  };
});

vi.mock("firebase/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/auth")>();

  return {
    ...actual,
    signInWithEmailAndPassword,
  };
});

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ name: "auth" }),
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

async function submitLogin() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText("Email admin"), "djbefolo@gmail.com");
  await user.type(screen.getByLabelText("Mot de passe"), "correct-password");
  await user.click(screen.getByRole("button", { name: "Ouvrir la session admin" }));
}

describe("AdminLoginForm submit flow", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    signInWithEmailAndPassword.mockReset();
    getIdToken.mockReset();
    vi.unstubAllGlobals();
  });

  it("forces a fresh Firebase ID token before creating the admin session", async () => {
    getIdToken.mockResolvedValueOnce("fresh-admin-token");
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken },
    });
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminLoginForm />);
    await submitLogin();

    await waitFor(() => {
      expect(getIdToken).toHaveBeenCalledWith(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/session/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ idToken: "fresh-admin-token" }),
        }),
      );
      expect(replace).toHaveBeenCalledWith("/admin");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("distinguishes authenticated users missing admin claims", async () => {
    getIdToken.mockResolvedValueOnce("student-token");
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            error: "Authenticated Firebase user is missing AVI CERTIFY admin claims.",
            code: "ADMIN_CLAIM_REQUIRED",
          },
          false,
          403,
        ),
      ),
    );

    render(<AdminLoginForm />);
    await submitLogin();

    expect(
      await screen.findByText("Compte authentifie, mais claim admin AVI CERTIFY manquant."),
    ).toBeInTheDocument();
  });

  it("asks for a new login when Firebase authentication is too old", async () => {
    getIdToken.mockResolvedValueOnce("old-admin-token");
    signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            error: "Recent Firebase authentication is required for admin access.",
            code: "ADMIN_RECENT_AUTH_REQUIRED",
          },
          false,
          401,
        ),
      ),
    );

    render(<AdminLoginForm />);
    await submitLogin();

    expect(
      await screen.findByText(
        "Authentification admin trop ancienne. Reconnectez-vous puis reessayez.",
      ),
    ).toBeInTheDocument();
  });

  it("distinguishes wrong credentials from claim errors", async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(new Error("auth/wrong-password"));

    render(<AdminLoginForm />);
    await submitLogin();

    expect(
      await screen.findByText("Identifiants admin invalides ou session Firebase expiree."),
    ).toBeInTheDocument();
  });
});
