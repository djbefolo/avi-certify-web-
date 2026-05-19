"use client";

import { useCallback } from "react";
import type { User } from "firebase/auth";
import {
  captureAnalyticsEvent,
  identifyAnalyticsUser,
  resetAnalyticsUser,
} from "@/lib/analytics/posthog";
import type {
  AnalyticsEventName,
  AnalyticsEventPayloads,
} from "@/lib/analytics/events";
import type { DocumentType } from "@/types/document";
import type { PaymentServiceType } from "@/types/payment";

export function useAnalytics() {
  const track = useCallback(
    <TEventName extends AnalyticsEventName>(
      eventName: TEventName,
      properties: AnalyticsEventPayloads[TEventName],
    ) => {
      captureAnalyticsEvent(eventName, properties);
    },
    [],
  );

  const identifyUser = useCallback((user: Pick<User, "uid"> | null) => {
    if (!user) {
      return;
    }

    identifyAnalyticsUser(user.uid);
  }, []);

  const resetUser = useCallback(() => {
    resetAnalyticsUser();
  }, []);

  const trackCtaClick = useCallback(
    (location: string, label: string, href?: string) => {
      track("cta_clicked", { location, label, href });
    },
    [track],
  );

  const trackLeadSubmitted = useCallback(
    (requestedService: AnalyticsEventPayloads["lead_submitted"]["requestedService"]) => {
      track("lead_submitted", { requestedService });
    },
    [track],
  );

  const trackSignupStarted = useCallback(() => {
    track("signup_started", { method: "email" });
  }, [track]);

  const trackSignupCompleted = useCallback(() => {
    track("signup_completed", { method: "email" });
  }, [track]);

  const trackLoginCompleted = useCallback(() => {
    track("login_completed", { method: "email" });
  }, [track]);

  const trackDocumentUploaded = useCallback(
    (documentType: DocumentType) => {
      track("document_uploaded", { documentType });
    },
    [track],
  );

  const trackPaymentStarted = useCallback(
    (serviceType: PaymentServiceType) => {
      track("payment_started", { serviceType });
    },
    [track],
  );

  const trackCheckoutStarted = useCallback(
    (serviceType: PaymentServiceType) => {
      track("checkout_started", { serviceType });
    },
    [track],
  );

  const trackLogoutClicked = useCallback(
    (location: string) => {
      track("logout_clicked", { location });
    },
    [track],
  );

  return {
    track,
    identifyUser,
    resetUser,
    trackCtaClick,
    trackLeadSubmitted,
    trackSignupStarted,
    trackSignupCompleted,
    trackLoginCompleted,
    trackDocumentUploaded,
    trackPaymentStarted,
    trackCheckoutStarted,
    trackLogoutClicked,
  };
}

