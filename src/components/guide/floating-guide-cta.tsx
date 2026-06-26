"use client";

import { BookOpenCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GuideRequestModal } from "@/components/guide/guide-request-modal";
import { useAnalytics } from "@/hooks/use-analytics";

const DEFAULT_GUIDE_CTA_DELAY_MS = 120_000;
const DEFAULT_GUIDE_CTA_DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;
const GUIDE_CTA_DISMISS_STORAGE_KEY = "avi-guide-cta-dismissed-at";

const hiddenRoutePrefixes = [
  "/dashboard",
  "/dossier",
  "/profil",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/verification-email",
] as const;

type FloatingGuideCtaProps = {
  delayMs?: number;
  dismissDurationMs?: number;
  storageKey?: string;
};

function shouldHideGuideCta(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return hiddenRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function readDismissedAt(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const dismissedAt = rawValue ? Number(rawValue) : null;

    return dismissedAt && Number.isFinite(dismissedAt) ? dismissedAt : null;
  } catch {
    return null;
  }
}

function rememberDismissal(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // localStorage can be unavailable in hardened browsers. The CTA still hides
    // for the current render cycle through component state.
  }
}

function clearExpiredDismissal(
  storageKey: string,
  dismissedAt: number,
  dismissDurationMs: number,
) {
  if (Date.now() - dismissedAt <= dismissDurationMs) {
    return false;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage cleanup failures; the CTA can still rely on runtime state.
  }

  return true;
}

export function FloatingGuideCta({
  delayMs = DEFAULT_GUIDE_CTA_DELAY_MS,
  dismissDurationMs = DEFAULT_GUIDE_CTA_DISMISS_DURATION_MS,
  storageKey = GUIDE_CTA_DISMISS_STORAGE_KEY,
}: FloatingGuideCtaProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const { trackGuideCtaClicked, trackGuideModalOpened } = useAnalytics();
  const shouldHide = shouldHideGuideCta(pathname);

  const dismissGuideCta = useCallback(() => {
    rememberDismissal(storageKey);
    setOpen(false);
    setVisible(false);
  }, [storageKey]);

  useEffect(() => {
    setVisible(false);

    if (shouldHide) {
      setOpen(false);
      return;
    }

    const dismissedAt = readDismissedAt(storageKey);

    if (
      dismissedAt &&
      !clearExpiredDismissal(storageKey, dismissedAt, dismissDurationMs)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, dismissDurationMs, shouldHide, storageKey]);

  const handleModalOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen && open) {
      dismissGuideCta();
    }
  };

  const handleOpenModal = () => {
    trackGuideCtaClicked("floating_cta");
    trackGuideModalOpened("floating_cta");
    setOpen(true);
  };

  if (shouldHide || !visible) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-24 right-4 z-30 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 sm:right-6 sm:w-auto">
        <button
          aria-label="Recevoir le guide 2026 gratuit"
          className="group flex w-full items-center gap-3 rounded-2xl border border-accent/25 bg-white/95 p-3 pr-10 text-left shadow-xl shadow-slate-950/10 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={handleOpenModal}
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
        <button
          aria-label="Masquer le CTA guide"
          className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={dismissGuideCta}
          type="button"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <GuideRequestModal
        onOpenChange={handleModalOpenChange}
        open={open}
        origin="floating_cta"
      />
    </>
  );
}
