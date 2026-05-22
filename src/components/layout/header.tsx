"use client";

import Link from "next/link";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { navLinks } from "@/constants/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const { resetUser, trackCtaClick, trackLogoutClicked } = useAnalytics();

  const handleLogout = async () => {
    trackLogoutClicked("public_header");
    await logout();
    resetUser();
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            AVI
          </span>
          <span>AVI CERTIFY</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {isAuthenticated ? (
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Tableau de bord
              </Link>
            </Button>
            <Button variant="outline" type="button" onClick={handleLogout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sortir
            </Button>
          </div>
        ) : (
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" asChild>
              <Link href="/connexion">Se connecter</Link>
            </Button>
            <Button variant="cta" asChild>
              <Link
                href="/contact"
                onClick={() =>
                  trackCtaClick("public_header", "Commencer", "/contact")
                }
              >
                Commencer
              </Link>
            </Button>
          </div>
        )}

        <Button
          className="lg:hidden"
          size="icon"
          variant="outline"
          type="button"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </Button>
      </div>

      {isOpen ? (
        <div className="border-t bg-background lg:hidden">
          <nav className="container grid gap-1 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <div className="mt-2 grid gap-2 border-t pt-3">
                <Button variant="outline" asChild>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Tableau de bord
                  </Link>
                </Button>
                <Button variant="outline" type="button" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Se déconnecter
                </Button>
              </div>
            ) : (
              <div className="mt-2 grid gap-2 border-t pt-3">
                <Button variant="outline" asChild>
                  <Link href="/connexion" onClick={() => setIsOpen(false)}>
                    Se connecter
                  </Link>
                </Button>
                <Button variant="cta" asChild>
                  <Link
                    href="/contact"
                    onClick={() => {
                      trackCtaClick(
                        "public_mobile_menu",
                        "Commencer mon dossier",
                        "/contact",
                      );
                      setIsOpen(false);
                    }}
                  >
                    Commencer mon dossier
                  </Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
