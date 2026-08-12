import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { getAdminLeadsStore, AdminLeadValidationError } from "@/lib/admin/admin-leads-store";
import { getAdminOperationsStore } from "@/lib/admin/admin-ops-store";
import type { AdminActor } from "@/lib/admin/admin-auth";
import type {
  AdminLead,
  AdminProspect360,
  AdminProspect360Account,
  AdminProspect360Communication,
  AdminProspect360Document,
  AdminProspect360Note,
  AdminProspect360TimelineItem,
} from "@/types/admin-crm";
import type {
  AdminCaseEvent,
  AdminClientProfile,
  AdminNotification,
  ClientCase,
  ClientDocument,
  CommunicationLog,
} from "@/types/admin-ops";

const PROFILE_REMINDER_TEMPLATE = "onboarding_profile_reminder_24h";
const WELCOME_TEMPLATE = "auth_welcome";

type AccountSource = {
  profile: AdminClientProfile | null;
  createdAt: string | null;
  emailVerifiedAt: string | null;
  disabled: boolean | null;
};

export type Prospect360Source = {
  lead: AdminLead;
  account: AccountSource;
  communications: CommunicationLog[];
  documents: ClientDocument[];
  notifications: AdminNotification[];
  events: AdminCaseEvent[];
  cases: ClientCase[];
  payments: Array<Record<string, unknown>>;
};

function hasFirebaseAdminEnv() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function asIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate(): Date }).toDate();
    return date.toISOString();
  }
  return null;
}

function maskUid(uid: string | null) {
  if (!uid) return null;
  if (uid.length <= 12) return `${uid.slice(0, 4)}…`;
  return `${uid.slice(0, 8)}…${uid.slice(-4)}`;
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function safeLinkedUid(lead: AdminLead) {
  return lead.identityLinkStatus === "LINKED" ? lead.linkedUid : null;
}

function paymentUid(payment: Record<string, unknown>) {
  return typeof payment.uid === "string"
    ? payment.uid
    : typeof payment.ownerId === "string"
      ? payment.ownerId
      : null;
}

function paymentCaseId(payment: Record<string, unknown>) {
  return typeof payment.caseId === "string" ? payment.caseId : null;
}

function eventBelongsToLead(event: AdminCaseEvent, lead: AdminLead, uid: string | null) {
  return event.eventPayload.leadId === lead.id || Boolean(uid && event.uid === uid);
}

function notificationBelongsToLead(notification: AdminNotification, lead: AdminLead, uid: string | null) {
  return notification.metadata?.leadId === lead.id || Boolean(uid && notification.relatedUid === uid);
}

function communicationBelongsToLead(log: CommunicationLog, lead: AdminLead, uid: string | null) {
  if (uid && log.uid === uid) return true;
  return Boolean(lead.email && normalizeEmail(log.recipient) === normalizeEmail(lead.email));
}

function documentBelongsToLead(document: ClientDocument, lead: AdminLead, uid: string | null) {
  if (uid && document.uid === uid) return true;
  return (
    document.ownerResolution?.leadId === lead.id &&
    !document.ownerResolution.warning &&
    lead.identityLinkStatus !== "AMBIGUOUS" &&
    lead.identityLinkStatus !== "CONFLICT"
  );
}

function communicationLabel(log: CommunicationLog) {
  if (log.template === PROFILE_REMINDER_TEMPLATE) return "Rappel profil incomplet";
  if (log.template === WELCOME_TEMPLATE) return "Email de bienvenue";
  if (log.type === "DOCUMENT_REQUEST") return "Demande de document";
  if (log.type === "ADMIN_NOTIFICATION") return "Notification administrative";
  if (log.type === "EMAIL") return "Email transactionnel";
  return "Communication système";
}

function communicationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Planifiée",
    PROCESSING: "En cours",
    QUEUED: "En file",
    SENT: "Envoyée",
    DELIVERED: "Délivrée",
    FAILED: "Échec",
    CANCELLED: "Annulée",
    NOT_SENT: "Non envoyée",
    ACTIVE: "Active",
    RESOLVED: "Résolue",
  };
  return labels[status] ?? "Statut non précisé";
}

function documentTypeLabel(type: string) {
  const labels: Record<string, string> = {
    passport: "Passeport",
    admission_letter: "Lettre d’admission",
    proof_of_address: "Justificatif de domicile",
    accommodation_certificate: "Attestation d’hébergement",
  };
  return labels[type] ?? "Document";
}

function caseStatusLabel(status: string) {
  const labels: Record<string, string> = {
    NEW: "Nouveau",
    PROFILE_INCOMPLETE: "Profil incomplet",
    DOCUMENTS_PENDING: "Documents attendus",
    DOCUMENTS_SUBMITTED: "Documents soumis",
    UNDER_REVIEW: "En revue",
    PAYMENT_PENDING: "Paiement en attente",
    PAYMENT_CONFIRMED: "Paiement confirmé",
    COMPLETED: "Terminé",
    BLOCKED: "Bloqué",
  };
  return labels[status] ?? "Statut non précisé";
}

function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    paid: "Payé",
    failed: "Échec",
    cancelled: "Annulé",
    refunded: "Remboursé",
  };
  return labels[status.toLowerCase()] ?? "Statut non précisé";
}

function mapCommunication(log: CommunicationLog): AdminProspect360Communication {
  return {
    id: log.id,
    channel: log.type,
    label: communicationLabel(log),
    status: log.status,
    occurredAt: log.sentAt ?? log.lastAttemptAt ?? log.createdAt,
  };
}

function mapDocument(document: ClientDocument): AdminProspect360Document {
  return {
    id: document.id,
    fileName: document.fileName,
    documentType: document.documentType,
    status: document.verificationStatus,
    uploadedAt: document.uploadedAt,
    previewUrl: `/api/admin/documents/${encodeURIComponent(document.id)}/preview`,
  };
}

function sortNewest<T extends { occurredAt: string }>(items: T[]) {
  return items.sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
}

function accountStatus(account: AccountSource, linkedUid: string | null): AdminProspect360Account["status"] {
  if (!linkedUid) return "NOT_LINKED";
  if (account.disabled === true || account.profile?.accountStatus === "DISABLED") return "DISABLED";
  if (account.disabled === false || account.profile?.accountStatus === "ACTIVE") return "ACTIVE";
  return "UNKNOWN";
}

function createTimeline(source: Prospect360Source): AdminProspect360TimelineItem[] {
  const uid = safeLinkedUid(source.lead);
  const caseIds = new Set(source.cases.map((item) => item.id));
  const items: AdminProspect360TimelineItem[] = [
    {
      id: `lead:${source.lead.id}`,
      kind: "LEAD",
      label: "Prospect créé",
      occurredAt: source.lead.createdAt,
      actor: null,
    },
  ];

  if (source.account.createdAt) {
    items.push({ id: `account:${uid}`, kind: "ACCOUNT", label: "Compte créé", occurredAt: source.account.createdAt, actor: null });
  }
  if (source.account.emailVerifiedAt) {
    items.push({ id: `verified:${uid}`, kind: "ACCOUNT", label: "Email vérifié", occurredAt: source.account.emailVerifiedAt, actor: null });
  }

  source.communications.forEach((log) => {
    const mapped = mapCommunication(log);
    items.push({ id: `communication:${log.id}`, kind: "COMMUNICATION", label: `${mapped.label} · ${communicationStatusLabel(mapped.status)}`, occurredAt: mapped.occurredAt, actor: null });
  });
  source.documents.forEach((document) => {
    if (document.uploadedAt) {
      items.push({ id: `document:${document.id}`, kind: "DOCUMENT", label: `Document reçu · ${documentTypeLabel(document.documentType)}`, occurredAt: document.uploadedAt, actor: null });
    }
  });
  source.events.forEach((event) => {
    items.push({ id: `event:${event.id}`, kind: event.actorType === "system" ? "SYSTEM" : "CRM", label: event.eventLabel, occurredAt: event.createdAt, actor: event.actorType === "admin" ? "Admin" : event.actorType === "client" ? "Prospect" : "Système" });
  });
  source.notifications.forEach((notification) => {
    items.push({ id: `notification:${notification.id}`, kind: "SYSTEM", label: notification.title, occurredAt: notification.createdAt, actor: null });
  });
  source.cases.forEach((clientCase) => {
    items.push({ id: `case:${clientCase.id}`, kind: "SYSTEM", label: `Dossier lié · ${caseStatusLabel(clientCase.status)}`, occurredAt: clientCase.createdAt, actor: null });
  });
  source.payments.forEach((payment, index) => {
    const occurredAt = asIso(payment.createdAt) ?? asIso(payment.updatedAt);
    if (!occurredAt || (paymentCaseId(payment) && !caseIds.has(paymentCaseId(payment)!))) return;
    const status = typeof payment.status === "string" ? payment.status : "statut inconnu";
    items.push({ id: `payment:${typeof payment.id === "string" ? payment.id : index}`, kind: "SYSTEM", label: `Paiement lié · ${paymentStatusLabel(status)}`, occurredAt, actor: null });
  });

  return sortNewest(items);
}

export function composeProspect360ReadModel(source: Prospect360Source): AdminProspect360 {
  const uid = safeLinkedUid(source.lead);
  const communications = source.communications
    .filter((item) => communicationBelongsToLead(item, source.lead, uid))
    .map(mapCommunication)
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
  const documents = source.documents
    .filter((item) => documentBelongsToLead(item, source.lead, uid))
    .map(mapDocument)
    .sort((left, right) => Date.parse(right.uploadedAt ?? "") - Date.parse(left.uploadedAt ?? ""));
  const events = source.events.filter((item) => eventBelongsToLead(item, source.lead, uid));
  const notifications = source.notifications.filter((item) => notificationBelongsToLead(item, source.lead, uid));
  const cases = uid ? source.cases.filter((item) => item.uid === uid) : [];
  const caseIds = new Set(cases.map((item) => item.id));
  const payments = uid
    ? source.payments.filter((item) => paymentUid(item) === uid || caseIds.has(paymentCaseId(item) ?? ""))
    : [];
  const welcome = source.communications.find(
    (item) => communicationBelongsToLead(item, source.lead, uid) && item.template === WELCOME_TEMPLATE,
  );
  const reminder = source.communications.find(
    (item) => communicationBelongsToLead(item, source.lead, uid) && item.template === PROFILE_REMINDER_TEMPLATE,
  );
  const legacyNote: AdminProspect360Note[] = source.lead.crmNotes
    ? [{ id: `legacy:${source.lead.id}`, note: source.lead.crmNotes, createdAt: source.lead.updatedAt, createdBy: source.lead.crmOwner }]
    : [];
  const notes: AdminProspect360Note[] = [
    ...events
      .filter((event) => event.eventType === "lead_internal_note_added" && typeof event.eventPayload.note === "string")
      .map((event) => ({ id: event.id, note: event.eventPayload.note as string, createdAt: event.createdAt, createdBy: event.actorId })),
    ...legacyNote,
  ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  return {
    lead: source.lead,
    account: {
      uidMasked: maskUid(uid),
      status: accountStatus(source.account, uid),
      createdAt: source.account.createdAt,
      emailVerifiedAt: source.account.emailVerifiedAt,
    },
    onboarding: {
      accountCreatedAt: source.account.createdAt,
      emailVerifiedAt: source.account.emailVerifiedAt,
      welcomeEmailStatus: welcome?.status ?? null,
      welcomeEmailAt: welcome?.sentAt ?? welcome?.createdAt ?? null,
      profileReminderStatus: reminder?.status ?? null,
      profileReminderAt: reminder?.sentAt ?? reminder?.lastAttemptAt ?? reminder?.createdAt ?? null,
      profileReminderDueAt: reminder?.dueAt ?? null,
      reminderAttemptCount: reminder?.attemptCount ?? null,
      humanFollowUpStatus: reminder?.humanFollowUpStatus ?? null,
      humanFollowUpDueAt: reminder?.humanFollowUpDueAt ?? null,
      humanFollowUpCreatedAt: reminder?.humanFollowUpEscalatedAt ?? null,
      humanFollowUpResolvedAt: reminder?.humanFollowUpResolvedAt ?? null,
    },
    communications,
    documents,
    notes,
    timeline: createTimeline({ ...source, communications: source.communications.filter((item) => communicationBelongsToLead(item, source.lead, uid)), documents: source.documents.filter((item) => documentBelongsToLead(item, source.lead, uid)), events, notifications, cases, payments }),
  };
}

async function loadAccount(uid: string | null, profiles: AdminClientProfile[]): Promise<AccountSource> {
  const profile = uid ? profiles.find((item) => item.uid === uid) ?? null : null;
  if (!uid || !hasFirebaseAdminEnv()) {
    return { profile, createdAt: profile?.createdAt ?? null, emailVerifiedAt: null, disabled: profile?.accountStatus === "DISABLED" ? true : null };
  }

  const [userSnapshot, authUser] = await Promise.all([
    getAdminFirestore().collection("users").doc(uid).get().catch(() => null),
    getAdminAuth().getUser(uid).catch(() => null),
  ]);
  const userData = userSnapshot?.exists ? userSnapshot.data() : null;
  return {
    profile,
    createdAt: asIso(userData?.createdAt) ?? (authUser?.metadata.creationTime ? new Date(authUser.metadata.creationTime).toISOString() : profile?.createdAt ?? null),
    emailVerifiedAt: asIso(userData?.emailVerifiedAt),
    disabled: authUser?.disabled ?? (profile?.accountStatus === "DISABLED" ? true : null),
  };
}

export async function getAdminProspect360(leadId: string) {
  const lead = await getAdminLeadsStore().getLead(leadId);
  if (!lead) return null;
  const uid = safeLinkedUid(lead);
  const store = getAdminOperationsStore();
  const [profiles, communications, documents, notifications, events, cases, payments] = await Promise.all([
    store.listClients(),
    store.listCommunications(),
    store.listDocumentsWithOwners(),
    store.listNotifications(),
    store.listEvents(),
    store.listCases(),
    store.listPayments(),
  ]);
  const account = await loadAccount(uid, profiles);
  return composeProspect360ReadModel({ lead, account, communications, documents, notifications, events, cases, payments });
}

export async function addProspectInternalNote(leadId: string, rawNote: unknown, actor: AdminActor) {
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  if (!note || note.length > 2_000) {
    throw new AdminLeadValidationError("Internal note must contain between 1 and 2000 characters.");
  }
  const lead = await getAdminLeadsStore().getLead(leadId);
  if (!lead) throw new AdminLeadValidationError("Lead not found.", 404);
  const event = await getAdminOperationsStore().createEvent({
    caseId: null,
    uid: safeLinkedUid(lead),
    actorType: "admin",
    actorId: actor.uid,
    actorRole: actor.role,
    eventType: "lead_internal_note_added",
    eventLabel: "Note interne prospect ajoutée",
    eventPayload: { leadId, note },
  });
  return { id: event.id, note, createdAt: event.createdAt, createdBy: event.actorId } satisfies AdminProspect360Note;
}
