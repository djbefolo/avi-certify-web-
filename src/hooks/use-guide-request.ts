"use client";

import { useCallback, useState } from "react";

export const GUIDE_REQUEST_SUCCESS_MESSAGE =
  "Votre demande a bien été enregistrée. Si votre email est valide, vous recevrez un message AVI CERTIFY avec l'accès au guide depuis votre espace client sécurisé.";

const GUIDE_REQUEST_FALLBACK_ERROR =
  "Impossible d'enregistrer la demande de guide pour le moment. Veuillez réessayer.";

export type GuideRequestInput = {
  fullName: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  destinationCountry?: string | null;
  serviceInterest?: string | null;
  projectHorizon?: string | null;
  origin?: string | null;
  marketingConsent: true;
};

type GuideRequestPayload = GuideRequestInput & {
  source: "guide";
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
};

type GuideRequestApiSuccess = {
  ok: true;
  status: "NEW";
  guideDeliveryStatus?: "READY" | string;
  guideDeliveryChannel?: "client_space" | string;
  guideEmailSent?: boolean;
  guideEmailStatus?: string;
};

type GuideRequestApiError = {
  ok?: false;
  error?: string;
};

type GuideRequestState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanOptionalText(value?: string | null) {
  if (!value) {
    return null;
  }

  const cleaned = cleanText(value);

  return cleaned || null;
}

function addIfPresent(
  target: Partial<
    Pick<GuideRequestPayload, "utmSource" | "utmMedium" | "utmCampaign" | "referrer">
  >,
  key: "utmSource" | "utmMedium" | "utmCampaign" | "referrer",
  value: string | null,
) {
  if (value) {
    target[key] = value;
  }
}

function readGuideRequestAttribution() {
  const attribution: Partial<
    Pick<GuideRequestPayload, "utmSource" | "utmMedium" | "utmCampaign" | "referrer">
  > = {};

  if (typeof window === "undefined") {
    return attribution;
  }

  const searchParams = new URLSearchParams(window.location.search);

  addIfPresent(
    attribution,
    "utmSource",
    cleanOptionalText(searchParams.get("utm_source")),
  );
  addIfPresent(
    attribution,
    "utmMedium",
    cleanOptionalText(searchParams.get("utm_medium")),
  );
  addIfPresent(
    attribution,
    "utmCampaign",
    cleanOptionalText(searchParams.get("utm_campaign")),
  );
  addIfPresent(attribution, "referrer", cleanOptionalText(document.referrer));

  return attribution;
}

function buildGuideRequestPayload(input: GuideRequestInput): GuideRequestPayload {
  return {
    fullName: cleanText(input.fullName),
    email: cleanText(input.email).toLowerCase(),
    phone: cleanOptionalText(input.phone),
    country: cleanOptionalText(input.country),
    destinationCountry: cleanOptionalText(input.destinationCountry),
    serviceInterest: cleanOptionalText(input.serviceInterest),
    projectHorizon: cleanOptionalText(input.projectHorizon),
    origin: cleanOptionalText(input.origin),
    marketingConsent: input.marketingConsent,
    source: "guide",
    ...readGuideRequestAttribution(),
  };
}

async function parseGuideRequestResponse(response: Response) {
  let payload: GuideRequestApiSuccess | GuideRequestApiError | null = null;

  try {
    payload = (await response.json()) as
      | GuideRequestApiSuccess
      | GuideRequestApiError;
  } catch {
    // A malformed response should not expose technical details to visitors.
  }

  if (!response.ok || payload?.ok !== true) {
    const message =
      payload && "error" in payload && payload.error
        ? payload.error
        : GUIDE_REQUEST_FALLBACK_ERROR;

    throw new Error(message);
  }

  return payload;
}

export function useGuideRequest() {
  const [state, setState] = useState<GuideRequestState>({ status: "idle" });

  const resetGuideRequest = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  const submitGuideRequest = useCallback(async (input: GuideRequestInput) => {
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/guide/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildGuideRequestPayload(input)),
      });

      await parseGuideRequestResponse(response);

      setState({
        status: "success",
        message: GUIDE_REQUEST_SUCCESS_MESSAGE,
      });

      return true;
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : GUIDE_REQUEST_FALLBACK_ERROR,
      });

      return false;
    }
  }, []);

  return {
    state,
    submitGuideRequest,
    resetGuideRequest,
  };
}
