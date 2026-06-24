import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  GUIDE_FRANCE_2026_RESOURCE_ID,
  dashboardGuideResourceHref,
} from "@/lib/resources/guide-resource";
import {
  sendGuideAvailableEmail,
  type SendEmailResult,
} from "@/lib/server/email.service";

const LEADS_COLLECTION = "leads";

export type GuideDeliveryStatus = "READY";
export type GuideDeliveryChannel = "client_space";

export type PreparedGuideDelivery = {
  leadId: string;
  guideResourceId: string;
  guideDeliveryStatus: GuideDeliveryStatus;
  guideDeliveryChannel: GuideDeliveryChannel;
  guideDelivered: false;
};

export type GuideEmailDeliveryResult = {
  leadId: string;
  guideEmailSent: boolean;
  guideEmailStatus: SendEmailResult["status"];
  guideEmailMessageId: string | null;
  guideDelivered: false;
};

export class GuideDeliveryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "LEAD_ID_REQUIRED"
      | "LEAD_NOT_FOUND"
      | "LEAD_NOT_GUIDE_REQUEST"
      | "GUIDE_MARKETING_CONSENT_REQUIRED"
      | "GUIDE_DELIVERY_NOT_READY",
  ) {
    super(message);
  }
}

function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://www.avicertify.fr"
  ).replace(/\/$/, "");
}

function getGuideDashboardUrl() {
  return `${getAppBaseUrl()}${dashboardGuideResourceHref()}`;
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function getGuideLeadRef(leadId: string) {
  const cleanLeadId = leadId.trim();

  if (!cleanLeadId) {
    throw new GuideDeliveryError("Lead identifier is required.", "LEAD_ID_REQUIRED");
  }

  const db = getAdminFirestore();
  const leadRef = db.collection(LEADS_COLLECTION).doc(cleanLeadId);
  const snapshot = await leadRef.get();

  if (!snapshot.exists) {
    throw new GuideDeliveryError("Guide lead not found.", "LEAD_NOT_FOUND");
  }

  return {
    cleanLeadId,
    leadRef,
    lead: snapshot.data() ?? {},
  };
}

function assertGuideLead(lead: Record<string, unknown>) {
  if (lead.guideRequested !== true || lead.source !== "guide") {
    throw new GuideDeliveryError(
      "Lead is not a guide request.",
      "LEAD_NOT_GUIDE_REQUEST",
    );
  }
}

export async function prepareGuideDeliveryForLead(
  leadId: string,
): Promise<PreparedGuideDelivery> {
  const { cleanLeadId, leadRef, lead } = await getGuideLeadRef(leadId);
  assertGuideLead(lead);

  const guideDeliveryStatus: GuideDeliveryStatus = "READY";
  const guideDeliveryChannel: GuideDeliveryChannel = "client_space";

  await leadRef.set(
    {
      guideResourceId: GUIDE_FRANCE_2026_RESOURCE_ID,
      guideDeliveryStatus,
      guideDeliveryChannel,
      guideDeliveryPreparedAt: FieldValue.serverTimestamp(),
      guideDelivered: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    leadId: cleanLeadId,
    guideResourceId: GUIDE_FRANCE_2026_RESOURCE_ID,
    guideDeliveryStatus,
    guideDeliveryChannel,
    guideDelivered: false,
  };
}

export async function sendGuideDeliveryEmailForLead(
  leadId: string,
): Promise<GuideEmailDeliveryResult> {
  const { cleanLeadId, leadRef, lead } = await getGuideLeadRef(leadId);
  assertGuideLead(lead);

  if (lead.marketingConsent !== true) {
    throw new GuideDeliveryError(
      "Marketing consent is required before sending the guide email.",
      "GUIDE_MARKETING_CONSENT_REQUIRED",
    );
  }

  if (lead.guideDeliveryStatus !== "READY") {
    throw new GuideDeliveryError(
      "Guide delivery must be prepared before sending email.",
      "GUIDE_DELIVERY_NOT_READY",
    );
  }

  const emailResult = await sendGuideAvailableEmail({
    recipientEmail: stringField(lead.email),
    leadFullName: stringField(lead.fullName),
    dashboardUrl: getGuideDashboardUrl(),
  });
  const timestamp = FieldValue.serverTimestamp();
  const update: Record<string, unknown> = {
    guideLastDeliveryAttemptAt: timestamp,
    guideEmailStatus: emailResult.status,
    guideEmailMessageId: emailResult.messageId,
    guideEmailProvider: emailResult.provider,
    guideDelivered: false,
    updatedAt: timestamp,
  };

  if (emailResult.sent) {
    update.guideEmailSentAt = timestamp;
  }

  await leadRef.set(update, { merge: true });

  return {
    leadId: cleanLeadId,
    guideEmailSent: emailResult.sent,
    guideEmailStatus: emailResult.status,
    guideEmailMessageId: emailResult.messageId,
    guideDelivered: false,
  };
}
