"use client";

import type posthogDefault from "posthog-js";
import type {
  AnalyticsEventName,
  AnalyticsEventPayloads,
} from "@/lib/analytics/events";
import { hasAcceptedAnalyticsConsent } from "@/lib/analytics/consent";

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const postHogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

type PostHogClient = typeof posthogDefault;
type PageViewProperties = {
  path: string;
  pathname?: string;
  search?: string;
  url?: string;
  referrer?: string;
  title?: string;
};

let postHogClient: PostHogClient | null = null;
let initPromise: Promise<PostHogClient | null> | null = null;

function canUsePostHog() {
  return (
    typeof window !== "undefined" &&
    Boolean(postHogKey) &&
    hasAcceptedAnalyticsConsent()
  );
}

export function isPostHogConfigured() {
  return Boolean(postHogKey);
}

async function getPostHogClient(): Promise<PostHogClient | null> {
  if (postHogClient) {
    return postHogClient;
  }

  if (!canUsePostHog() || !postHogKey) {
    return null;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = import("posthog-js")
    .then((module) => {
      const posthog = module.default;

      posthog.init(postHogKey, {
        api_host: postHogHost,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        persistence: "localStorage",
      });
      postHogClient = posthog;

      return posthog;
    })
    .catch((error) => {
      console.warn("[analytics] PostHog initialization failed.", error);
      initPromise = null;

      return null;
    });

  return initPromise;
}

export function initPostHog() {
  if (!canUsePostHog() || !postHogKey) {
    return false;
  }

  void getPostHogClient();

  return true;
}

async function withPostHogClient(
  callback: (posthog: PostHogClient) => void,
  context: string,
) {
  const posthog = await getPostHogClient();

  if (!posthog) {
    return false;
  }

  try {
    callback(posthog);
    return true;
  } catch (error) {
    console.warn(`[analytics] ${context}`, error);
    return false;
  }
}

export function captureAnalyticsEvent<TEventName extends AnalyticsEventName>(
  eventName: TEventName,
  properties: AnalyticsEventPayloads[TEventName],
) {
  if (!canUsePostHog() || !postHogKey) {
    return false;
  }

  void withPostHogClient(
    (posthog) => {
      posthog.capture(eventName, properties);
    },
    `Failed to capture ${eventName}.`,
  );

  return true;
}

export function capturePageView(properties: PageViewProperties) {
  if (!canUsePostHog() || !postHogKey) {
    return false;
  }

  void withPostHogClient(
    (posthog) => {
      posthog.capture("$pageview", {
        $current_url: properties.url,
        path: properties.path,
        pathname: properties.pathname ?? properties.path,
        search: properties.search,
        referrer: properties.referrer,
        title: properties.title,
      });
      posthog.capture("page_view", {
        path: properties.path,
      });
    },
    "Failed to capture pageview.",
  );

  return true;
}

export function identifyAnalyticsUser(uid: string) {
  void uid;

  return false;
}

export function resetAnalyticsUser() {
  if (!canUsePostHog() || !postHogKey) {
    return false;
  }

  void withPostHogClient(
    (posthog) => {
      posthog.reset();
    },
    "Failed to reset user.",
  );

  return true;
}
