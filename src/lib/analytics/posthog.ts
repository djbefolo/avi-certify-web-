"use client";

import type posthogDefault from "posthog-js";
import type {
  AnalyticsEventName,
  AnalyticsEventPayloads,
} from "@/lib/analytics/events";

const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const postHogHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";

type PostHogClient = typeof posthogDefault;

let postHogClient: PostHogClient | null = null;
let initPromise: Promise<PostHogClient | null> | null = null;

function canUsePostHog() {
  return typeof window !== "undefined" && Boolean(postHogKey);
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
        persistence: "localStorage+cookie",
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

export function identifyAnalyticsUser(uid: string) {
  if (!canUsePostHog() || !postHogKey) {
    return false;
  }

  void withPostHogClient(
    (posthog) => {
      posthog.identify(uid, {
        authProvider: "firebase",
      });
    },
    "Failed to identify user.",
  );

  return true;
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
