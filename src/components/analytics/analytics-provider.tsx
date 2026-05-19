"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  initPostHog,
} from "@/lib/analytics/posthog";
import { useAuth } from "@/hooks/use-auth";

type AnalyticsProviderProps = {
  children: ReactNode;
};

let lastTrackedPath: string | null = null;

function getSafeCurrentPath() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const identifiedUidRef = useRef<string | null>(null);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    const path = getSafeCurrentPath();

    if (!path || lastTrackedPath === path) {
      return;
    }

    lastTrackedPath = path;
    captureAnalyticsEvent("page_view", {
      path,
    });
  }, [pathname]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      identifiedUidRef.current = null;
      return;
    }

    if (identifiedUidRef.current === user.uid) {
      return;
    }

    identifiedUidRef.current = user.uid;
    identifyAnalyticsUser(user.uid);
  }, [loading, user]);

  return <>{children}</>;
}
