"use client";

import { BookOpenCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GuideRequestModal } from "@/components/guide/guide-request-modal";

const hiddenRoutePrefixes = [
  "/dashboard",
  "/dossier",
  "/profil",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/verification-email",
] as const;

function shouldHideGuideCta(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return hiddenRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function FloatingGuideCta() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (shouldHideGuideCta(pathname)) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:w-auto">
        <button
          aria-label="Recevoir le guide 2026 gratuit"
          className="group flex w-full items-center gap-3 rounded-2xl border border-accent/25 bg-white/95 p-3 text-left shadow-xl shadow-slate-950/10 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
            <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-wide text-accent">
              Guide 2026 gratuit
            </span>
            <span className="block text-sm font-semibold text-foreground">
              Recevoir le guide
            </span>
            <span className="mt-0.5 hidden text-xs leading-5 text-muted-foreground sm:block">
              Éviter les erreurs dans votre projet d'études en France
            </span>
          </span>
        </button>
      </div>

      <GuideRequestModal
        onOpenChange={setOpen}
        open={open}
        origin="floating_cta"
      />
    </>
  );
}
