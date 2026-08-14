"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { GuideRequestModal } from "@/components/guide/guide-request-modal";
import { useAnalytics } from "@/hooks/use-analytics";

export function HomeGuideCta() {
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
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
        onClick={openGuide}
        type="button"
      >
        Recevoir le Guide 2026
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <GuideRequestModal onOpenChange={setOpen} open={open} origin="homepage_guide" />
    </>
  );
}
