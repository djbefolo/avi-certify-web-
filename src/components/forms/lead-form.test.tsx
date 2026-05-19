import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LeadForm } from "@/components/forms/lead-form";

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackLeadSubmitted: vi.fn(),
  }),
}));

describe("LeadForm", () => {
  it("shows validation errors and does not call the API for empty input", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<LeadForm />);

    await user.click(
      screen.getByRole("button", { name: /recevoir un accompagnement/i }),
    );

    expect(
      await screen.findByText(/Le nom complet doit contenir/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
