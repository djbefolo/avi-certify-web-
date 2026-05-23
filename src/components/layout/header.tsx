"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { navLinks } from "@/constants/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, logout } = useAuth();
  const { resetUser, trackCtaClick, trackLogoutClicked } = useAnalytics();

  const handleLogout = async () => {
    trackLogoutClicked("public_header");
    await logout();
    resetUser();
    setIsOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-background/95 shadow-sm backdrop-blur">
      <div className="container flex h-[4.75rem] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
          <Image
            src="/assets/photos/logo_avi_certify.png"
            alt="AVI CERTIFY"
            width={190}
            height={50}
            className="h-12 w-auto sm:h-[3.25rem]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-primary/5 text-primary shadow-[inset_0_-2px_0_hsl(var(--institutional-yellow))]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {isAuthenticated ? (
          <div className="hidden items-center gap-2 lg:flex">
            <div className="group relative">
              <Button variant="ghost">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Mon espace
              </Button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background py-2 shadow-lg opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profil"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Profil
                </Link>
                <Link
                  href="/dossier/documents"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Mes documents
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden items-center gap-2 lg:flex">
            <div className="group relative">
              <Button variant="ghost" className="text-primary hover:bg-primary/5">
                Compte
              </Button>
              <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border bg-background py-2 shadow-lg opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <Link
                  href="/connexion"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Se connecter
                </Link>
                <Link
                  href="/inscription"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Créer un compte
                </Link>
                <Link
                  href="/mot-de-passe-oublie"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Mot de passe oublié
                </Link>
                <Link
                  href="/verification-email"
                  className="block px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  Vérification email
                </Link>
              </div>
            </div>
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
        <div className="border-t bg-background shadow-lg lg:hidden">
          <nav className="container grid gap-1 py-3">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-2 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            {isAuthenticated ? (
              <div className="mt-2 grid gap-2 border-t pt-3">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mon espace
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/profil" onClick={() => setIsOpen(false)}>
                    Profil
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dossier/documents" onClick={() => setIsOpen(false)}>
                    Documents
                  </Link>
                </Button>
                <Button variant="outline" type="button" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div className="mt-2 grid gap-2 border-t pt-3">
                <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Compte
                </p>
                <Button variant="outline" asChild>
                  <Link href="/connexion" onClick={() => setIsOpen(false)}>
                    Connexion
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/inscription" onClick={() => setIsOpen(false)}>
                    Inscription
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/mot-de-passe-oublie" onClick={() => setIsOpen(false)}>
                    Mot de passe oublié
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/verification-email" onClick={() => setIsOpen(false)}>
                    Vérification email
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
