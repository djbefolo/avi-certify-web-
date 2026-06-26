"use client";

import { useEffect } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

export function PricingViewTracker() {
  const { trackPricingViewed } = useAnalytics();

  useEffect(() => {
    trackPricingViewed("/prix");
  }, [trackPricingViewed]);

  return null;
}
