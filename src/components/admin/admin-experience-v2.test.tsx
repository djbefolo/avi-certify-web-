import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-experience-v2";

describe("Admin Experience V2 navigation", () => {
  it("renders grouped navigation with a clear active section", () => {
    render(
      <AdminSidebar
        active="leads"
        collapsed={false}
        isMobileOpen={false}
        onCloseMobile={vi.fn()}
        onSelect={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByText("Commercial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prospects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Documents" })).toBeInTheDocument();
  });

  it("supports a compact collapsed sidebar", () => {
    render(
      <AdminSidebar
        active="overview"
        collapsed
        isMobileOpen={false}
        onCloseMobile={vi.fn()}
        onSelect={vi.fn()}
        onToggleCollapsed={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Vue d'ensemble" })).toHaveAttribute("title", "Vue d'ensemble");
    expect(screen.getByRole("button", { name: "Développer le menu" })).toBeInTheDocument();
  });

  it("uses a closeable drawer for mobile navigation", async () => {
    const user = userEvent.setup();
    const onCloseMobile = vi.fn();
    const onSelect = vi.fn();
    render(
      <AdminSidebar
        active="overview"
        collapsed={false}
        isMobileOpen
        onCloseMobile={onCloseMobile}
        onSelect={onSelect}
        onToggleCollapsed={vi.fn()}
      />,
    );

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Prospects" }));
    expect(onSelect).toHaveBeenCalledWith("leads");
    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it("exposes the contextual page title from the top bar", () => {
    render(
      <AdminTopbar
        active="documents"
        adminRole="super_admin"
        isBusy={false}
        onLogout={vi.fn()}
        onOpenMobileNav={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toBeInTheDocument();
  });
});
