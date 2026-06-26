"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentChoice,
} from "@/lib/analytics/consent";

export function AnalyticsConsentBanner() {
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>("rejected");
  const visible = choice === null;

  useEffect(() => {
    setChoice(readAnalyticsConsent());
  }, []);

  const handleChoice = (nextChoice: AnalyticsConsentChoice) => {
    writeAnalyticsConsent(nextChoice);
    setChoice(nextChoice);
  };

  if (!visible) {
    return null;
  }

  return (
    <aside
      aria-label="Consentement aux mesures d'audience"
      className="fixed bottom-4 left-4 right-4 z-40 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl shadow-slate-950/15 backdrop-blur sm:right-auto sm:max-w-xl"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Mesures d'audience
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Nous utilisons des mesures d'audience pour comprendre comment nos
            visiteurs utilisent AVI CERTIFY et améliorer nos services. Vous
            pouvez accepter ou refuser.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => handleChoice("rejected")}
            size="sm"
            type="button"
            variant="outline"
          >
            Refuser
          </Button>
          <Button
            onClick={() => handleChoice("accepted")}
            size="sm"
            type="button"
            variant="cta"
          >
            Accepter
          </Button>
        </div>
      </div>
    </aside>
  );
}
