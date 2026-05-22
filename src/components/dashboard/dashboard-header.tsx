"use client";

import { LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";

type DashboardHeaderProps = {
  title: string;
  description?: string;
};

function getDisplayName(email?: string | null) {
  if (!email) {
    return "Client AVI";
  }

  return email.split("@")[0] || email;
}

function getFirstName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { resetUser, trackLogoutClicked } = useAnalytics();
  const displayName = user?.displayName || getDisplayName(user?.email);
  const firstName = getFirstName(displayName);

  const handleLogout = async () => {
    trackLogoutClicked("dashboard_header");
    await logout();
    resetUser();
  };

  return (
    <header className="border-b bg-background/95">
      <div className="flex min-h-24 flex-col gap-4 px-4 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground lg:hidden">
            <Menu className="h-4 w-4" aria-hidden="true" />
            AVI CERTIFY
          </div>
          <p className="text-sm font-medium text-primary">Bonjour, {firstName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 p-2 lg:min-w-80">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background">
              <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Se deconnecter"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
