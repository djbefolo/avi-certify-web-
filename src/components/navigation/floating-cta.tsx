"use client";

import { MessageCircle, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAnalytics } from "@/hooks/use-analytics";

/**
 * Premium institutional floating CTA that adapts based on auth state:
 * - Unauthenticated: WhatsApp contact
 * - Authenticated: Dashboard access
 * - Authenticated on /dossier/* (documents, paiement...): WhatsApp contact,
 *   never hidden — this is where anxiety is highest (e.g. at the moment of
 *   payment), so the human contact channel must stay visible instead of
 *   being replaced by a redundant "Mon espace" link.
 *
 * Hidden only on the bare dashboard/account pages where a WhatsApp bubble
 * would be redundant with in-page navigation.
 * Calm, premium, conversion-oriented institutional UX.
 */
export function FloatingCta() {
  const { isAuthenticated } = useAuth();
  const { trackWhatsAppCtaClicked } = useAnalytics();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const isDossierRoute = pathname?.startsWith("/dossier") ?? false;

  // Hide on account/dashboard pages; /dossier/* stays visible (see above).
  const shouldHide =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/profil") ||
    pathname?.startsWith("/connexion") ||
    pathname?.startsWith("/inscription") ||
    pathname?.startsWith("/mot-de-passe-oublie") ||
    pathname?.startsWith("/verification-email");

  useEffect(() => {
    if (shouldHide) {
      setVisible(false);
      return;
    }

    const handleScroll = () => {
      // Show after scrolling 300px
      setVisible(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [shouldHide]);

  if (shouldHide) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-30 transition-all duration-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
      )}
    >
      {isAuthenticated && !isDossierRoute ? (
        <Link
          href="/dashboard"
          className="group flex items-center gap-3 rounded-lg border border-accent/30 bg-accent shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-l-lg bg-accent-dark">
            <LayoutDashboard className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <span className="pr-5 text-sm font-semibold text-white">
            Mon espace
          </span>
        </Link>
      ) : (
        <a
          href="https://wa.me/message/XOKRBYI3ZEQBM1"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppCtaClicked("floating_cta")}
          className="group flex items-center gap-3 rounded-lg border border-accent/30 bg-accent shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-l-lg bg-accent-dark">
            <MessageCircle className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <span className="pr-5 text-sm font-semibold text-white">
            Nous contacter
          </span>
        </a>
      )}
    </div>
  );
}
