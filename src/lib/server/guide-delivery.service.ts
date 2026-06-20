import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { GUIDE_FRANCE_2026_RESOURCE_ID } from "@/lib/resources/guide-resource";

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

export class GuideDeliveryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "LEAD_ID_REQUIRED"
      | "LEAD_NOT_FOUND"
      | "LEAD_NOT_GUIDE_REQUEST",
  ) {
    super(message);
  }
}

export async function prepareGuideDeliveryForLead(
  leadId: string,
): Promise<PreparedGuideDelivery> {
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

  const lead = snapshot.data() ?? {};

  if (lead.guideRequested !== true || lead.source !== "guide") {
    throw new GuideDeliveryError(
      "Lead is not a guide request.",
      "LEAD_NOT_GUIDE_REQUEST",
    );
  }

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
