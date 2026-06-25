import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FloatingGuideCta } from "@/components/guide/floating-guide-cta";

describe("FloatingGuideCta", () => {
  it("opens and closes the guide request modal", async () => {
    const user = userEvent.setup();

    render(<FloatingGuideCta />);

    expect(screen.getByText(/guide 2026 gratuit/i)).toBeInTheDocument();
    expect(screen.getByText(/erreurs/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /recevoir le guide 2026 gratuit/i }),
    );

    expect(
      await screen.findByRole("dialog", { name: /installation en france/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /fermer la fenetre guide/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
