import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PaymentButton } from "@/components/payments/payment-button";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isEmailVerified: true,
    user: {
      getIdToken: vi.fn().mockResolvedValue("firebase-id-token"),
    },
  }),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackCheckoutStarted: vi.fn(),
    trackPaymentStarted: vi.fn(),
  }),
}));

describe("PaymentButton", () => {
  it("disables the checkout button while the request is in flight", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const user = userEvent.setup();

    render(<PaymentButton />);

    const button = screen.getByRole("button", {
      name: /proceder au paiement/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });
  });
});
