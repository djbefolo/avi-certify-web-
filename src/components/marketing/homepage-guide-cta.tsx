"use client";

import { ArrowRight, BookOpenCheck } from "lucide-react";
import { useState } from "react";
import { GuideRequestModal } from "@/components/guide/guide-request-modal";
import { useAnalytics } from "@/hooks/use-analytics";

export function HomepageGuideCta() {
  const [open, setOpen] = useState(false);
  const { trackGuideCtaClicked, trackGuideModalOpened } = useAnalytics();

  const openGuide = () => {
    trackGuideCtaClicked("homepage_guide");
    trackGuideModalOpened("homepage_guide");
    setOpen(true);
  };

  return (
    <>
      <button
        className="group inline-flex items-center gap-3 rounded-md bg-[hsl(var(--institutional-yellow))] px-5 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:bg-[hsl(var(--institutional-yellow))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        onClick={openGuide}
        type="button"
      >
        <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
        Recevoir le guide 2026
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </button>
      <GuideRequestModal
        onOpenChange={setOpen}
        open={open}
        origin="homepage_guide"
      />
    </>
  );
}
