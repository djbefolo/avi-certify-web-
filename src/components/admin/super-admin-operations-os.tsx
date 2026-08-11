"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Download,
  Eye,
  FileArchive,
  FileText,
  Landmark,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FintechCommandCenter } from "@/components/admin/fintech-command-center";
import type { AdminRole } from "@/lib/admin/admin-auth";
import {
  documentTypeLabels,
  documentTypeValues,
} from "@/lib/validations/document";
import type {
  AdminCaseEvent,
  AdminClient360,
  AdminClientProfile,
  CommunicationLog,
  AdminNotification,
  AdminOperationsOverview,
  ClientCase,
  ClientDocument,
  ClientFinancialFile,
} from "@/types/admin-ops";
import type {
  AdminLead,
  AdminLeadCrmPriority,
  AdminLeadCrmStatus,
  AdminLeadLostReason,
  AdminLeadNextAction,
  AdminLeadStats,
  AdminLeadUpdateInput,
} from "@/types/admin-crm";
import {
  canTransitionLeadCrmStatus,
  isLeadNextActionOverdue,
} from "@/lib/leads/crm-qualification";
import type { HousingInventoryItem, HousingRequest } from "@/types/housing";

type Props = {
  adminRole: AdminRole;
  adminEmail?: string | null;
};

type OperationsData = {
  overview: AdminOperationsOverview | null;
  leads: AdminLead[];
  leadStats: AdminLeadStats | null;
  clients: AdminClientProfile[];
  cases: ClientCase[];
  documents: ClientDocument[];
  notifications: AdminNotification[];
  events: AdminCaseEvent[];
  housingInventory: HousingInventoryItem[];
  housingAutoIssuanceGloballyEnabled: boolean;
};

type CertificateGenerationResult = {
  generated: boolean;
  certificateId: string;
  certificateNumber: string | null;
  verificationUrl: string | null;
  reason?:
    | "certificate_already_exists"
    | "missing_profile_data"
    | "payment_not_confirmed"
    | "housing_address_unavailable"
    | "housing_request_missing"
    | "allocation_not_confirmed";
  message?: string;
  missingProfileFields?: string[];
  missingFieldLabels?: string[];
};

type ClientAction =
  | "request-document"
  | "add-note"
  | "send-notification";

type HousingAllocationForm = {
  inventoryReference: string;
  partnerName: string;
  residenceName: string;
  addressLine: string;
  postalCode: string;
  city: string;
  accommodationType: "studio" | "t1_bis" | "t2" | "shared" | "other";
  monthlyRent: number;
  currency: "EUR";
  confirmedAt: string;
  confirmationReference: string;
  validUntil: string;
  allocationReason: string;
  pricingOverrideReason: string;
};

type FinanceSection = "simulateur" | "simulations" | "devis" | "rapports";

const actionButtonLabels: Record<ClientAction, string> = {
  "request-document": "Demander document",
  "add-note": "Ajouter note",
  "send-notification": "Envoyer notification",
};

const financeSectionLabels: Record<FinanceSection, string> = {
  simulateur: "Lier simulation",
  simulations: "Lier simulation",
  devis: "Générer devis",
  rapports: "Rapport préfinancement",
};

function actionRequiresCaseMessage(actionLabel: string) {
  return `${actionLabel} indisponible : créez d'abord un dossier opérationnel pour ce client.`;
}

const tabs = [
  ["Vue d'ensemble", "overview", Landmark],
  ["Prospects", "leads", UserRound],
  ["Clients", "clients", UsersRound],
  ["Dossiers", "cases", BriefcaseBusiness],
  ["Documents", "documents", FileArchive],
  ["Paiements", "payments", CreditCard],
  ["Finance / Préfinancement", "finance", ClipboardCheck],
  ["Attestations / AVI", "certificates", FileText],
  ["Logements", "housing", Building2],
  ["Notifications", "notifications", Bell],
  ["Audit", "audit", ShieldCheck],
  ["Paramètres admin", "settings", Settings],
] as const;

type TabKey = (typeof tabs)[number][1];
type ManualAviFormState = {
  studentFullName: string;
  studentDateOfBirth: string;
  studentPlaceOfBirth: string;
  studentEmail: string;
  destinationCountry: string;
  originCountry: string;
  aviAmount: string;
  currency: string;
  academicYear: string;
  schoolName: string;
  issueDate: string;
  validUntil: string;
  aviReference: string;
  internalCaseReference: string;
  notesForAdmin: string;
};
type ManualAviGenerationResult = {
  generated: true;
  reference: string;
  documentId: string;
  aviNumberDisplay: string;
  verificationCode: string;
  verificationUrl: string;
  storagePath: string;
  htmlStoragePath: string;
  downloadUrl: string;
  templateName: string;
  pdfGenerationEngine: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultManualAviForm(): ManualAviFormState {
  return {
    studentFullName: "",
    studentDateOfBirth: "",
    studentPlaceOfBirth: "",
    studentEmail: "",
    destinationCountry: "France",
    originCountry: "",
    aviAmount: "",
    currency: "EUR",
    academicYear: "2026-2027",
    schoolName: "",
    issueDate: todayInputValue(),
    validUntil: "",
    aviReference: "",
    internalCaseReference: "",
    notesForAdmin: "",
  };
}

function apiHeaders() {
  return { "content-type": "application/json" };
}

async function getApiError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;
  return `${response.status} ${payload?.message ?? payload?.error ?? response.statusText ?? "Admin API error"}`;
}

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(await getApiError(response));
  return (await response.json()) as T;
}

async function writeApi<T>(path: string, body?: unknown, method = "POST") {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: apiHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(await getApiError(response));
  return (await response.json()) as T;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("fr-FR");
}

function displayClientName(client: Pick<AdminClientProfile, "fullName" | "email" | "uid">) {
  if (client.fullName?.trim()) return client.fullName.trim();
  if (client.email?.trim()) return client.email.split("@")[0] || client.email;
  return `Client ${client.uid.slice(0, 8)}`;
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    NEW: "Nouveau",
    PROFILE_INCOMPLETE: "Profil incomplet",
    DOCUMENTS_PENDING: "Documents attendus",
    DOCUMENTS_SUBMITTED: "Documents soumis",
    UNDER_REVIEW: "En revue",
    PAYMENT_PENDING: "Paiement en attente",
    PAYMENT_CONFIRMED: "Paiement confirmé",
    FINANCE_SIMULATED: "Finance simulée",
    QUOTE_GENERATED: "Devis généré",
    REPORT_GENERATED: "Rapport généré",
    CERTIFICATE_GENERATED: "Attestation générée",
    COMPLETED: "Terminé",
    BLOCKED: "Bloqué",
    NOT_STARTED: "Non démarré",
    MISSING: "Manquant",
    PARTIAL: "Partiel",
    SUBMITTED: "Soumis",
    VERIFIED: "Vérifié",
    REJECTED: "Rejeté",
    SIMULATED: "Simulé",
    GENERATED: "Généré",
  };
  return status ? labels[status] ?? status : "-";
}

function productLabel(product: string | null | undefined) {
  const labels: Record<string, string> = {
    TO_QUALIFY: "À qualifier",
    AVI_UNKNOWN: "AVI à qualifier",
    AVI: "AVI",
    PREFINANCEMENT: "Préfinancement",
    ATTESTATION_HEBERGEMENT: "Attestation hébergement",
    DOSSIER_VISA: "Dossier visa",
    MOBILITY_PACKAGE: "Pack mobilité",
  };
  return product ? labels[product] ?? product : "-";
}

function crmStatusLabel(status: AdminLeadCrmStatus) {
  const labels: Record<AdminLeadCrmStatus, string> = {
    new: "Nouveau",
    contacted: "Contacté",
    qualified: "Qualifié",
    converted: "Converti",
    lost: "Perdu",
  };

  return labels[status];
}

function crmPriorityLabel(priority: AdminLeadCrmPriority) {
  const labels: Record<AdminLeadCrmPriority, string> = {
    low: "Basse",
    normal: "Normale",
    high: "Haute",
  };

  return labels[priority];
}

function identityLinkStatusLabel(status: AdminLead["identityLinkStatus"]) {
  const labels: Record<AdminLead["identityLinkStatus"], string> = {
    UNLINKED: "Non rapproché",
    LINKED: "Compte lié",
    AMBIGUOUS: "Revue requise",
    CONFLICT: "Conflit",
  };

  return labels[status];
}

function linkedUidLabel(uid: string | null) {
  if (!uid) {
    return "-";
  }

  return uid.length > 16 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : uid;
}

function linkMethodLabel(method: string | null) {
  return method === "VERIFIED_EMAIL" ? "Verified email" : method ?? "-";
}

function qualificationReadinessLabel(
  readiness: AdminLead["qualificationReadiness"],
) {
  return readiness === "READY_FOR_REVIEW"
    ? "Prêt pour revue"
    : "Données à compléter";
}

function profileReadinessLabel(readiness: AdminLead["profileReadiness"]) {
  const labels: Record<AdminLead["profileReadiness"], string> = {
    INCOMPLETE: "Profil incomplet",
    SUFFICIENT_FOR_QUALIFICATION: "Suffisant pour qualification",
    COMPLETE: "Profil complet",
  };

  return labels[readiness];
}

function nextActionLabel(action: AdminLeadNextAction) {
  const labels: Record<AdminLeadNextAction, string> = {
    NONE: "Aucune",
    CALL_PROSPECT: "Appeler le prospect",
    WHATSAPP_PROSPECT: "Contacter sur WhatsApp",
    EMAIL_PROSPECT: "Envoyer un email",
    REQUEST_INFORMATION: "Demander des informations",
    REVIEW_PROFILE: "Revoir le profil",
    REVIEW_AMBIGUOUS_LINK: "Revoir le rapprochement",
    FOLLOW_UP: "Relancer",
  };

  return labels[action];
}

function qualificationReasonLabel(
  reason: AdminLead["qualificationReasons"][number],
) {
  const labels: Record<
    AdminLead["qualificationReasons"][number],
    string
  > = {
    CONTACT_AVAILABLE: "Contact disponible",
    PHONE_AVAILABLE: "Téléphone disponible",
    DESTINATION_KNOWN: "Destination connue",
    REQUESTED_SERVICE_KNOWN: "Service demandé connu",
    PROJECT_HORIZON_KNOWN: "Horizon projet connu",
    IDENTITY_LINKED: "Identité liée",
  };

  return labels[reason];
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function summarizeLeadsForUi(leads: AdminLead[]): AdminLeadStats {
  return {
    total: leads.length,
    new: leads.filter((lead) => lead.crmStatus === "new").length,
    contacted: leads.filter((lead) => lead.crmStatus === "contacted").length,
    qualified: leads.filter((lead) => lead.crmStatus === "qualified").length,
    converted: leads.filter((lead) => lead.crmStatus === "converted").length,
    lost: leads.filter((lead) => lead.crmStatus === "lost").length,
    guideSucceeded: leads.filter(
      (lead) =>
        lead.guideDeliveryStatus === "READY" ||
        lead.guideEmailStatus === "SENT",
    ).length,
    guideEmailFailures: leads.filter(
      (lead) =>
        lead.guideEmailStatus === "SEND_FAILED" ||
        lead.guideEmailStatus === "RECIPIENT_MISSING",
    ).length,
  };
}

function certificateGenerationMessage(result: CertificateGenerationResult) {
  if (result.message?.trim()) {
    return result.message.trim();
  }

  if (result.reason === "certificate_already_exists") {
    return "Attestation deja disponible pour ce dossier.";
  }

  if (result.reason === "payment_not_confirmed") {
    return "Generation bloquee : le paiement du dossier n'est pas confirme.";
  }

  if (result.reason === "housing_address_unavailable") {
    return "Generation bloquee : aucune adresse d'hebergement disponible pour ce dossier.";
  }

  if (result.reason === "housing_request_missing") {
    return "Generation bloquee : la demande logement est introuvable.";
  }

  if (result.reason === "allocation_not_confirmed") {
    return "Generation bloquee : confirmez d'abord la disponibilite partenaire dans la fiche logement.";
  }

  if (result.reason === "missing_profile_data") {
    const labels = result.missingFieldLabels?.length
      ? result.missingFieldLabels
      : result.missingProfileFields;

    return labels?.length
      ? `Generation bloquee : profil incomplet (${labels.join(", ")}).`
      : "Generation bloquee : profil incomplet.";
  }

  return "Generation attestation impossible : condition metier non satisfaite.";
}

function normalizeActionNotice(success: string) {
  return success.includes("Attestation") ? "Attestation generee." : success;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function SuperAdminOperationsOS({ adminRole, adminEmail }: Props) {
  const [active, setActive] = useState<TabKey>("overview");
  const [query, setQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<AdminClient360 | null>(null);
  const [selectedHousingRequest, setSelectedHousingRequest] =
    useState<HousingRequest | null>(null);
  const [data, setData] = useState<OperationsData>({
    overview: null,
    leads: [],
    leadStats: null,
    clients: [],
    cases: [],
    documents: [],
    notifications: [],
    events: [],
    housingInventory: [],
    housingAutoIssuanceGloballyEnabled: false,
  });
  const [action, setAction] = useState<ClientAction | null>(null);
  const [actionCase, setActionCase] = useState<ClientCase | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] =
    useState<(typeof documentTypeValues)[number]>("passport");
  const [clientActionMessage, setClientActionMessage] = useState<string | null>(null);
  const [financeClientUid, setFinanceClientUid] = useState<string | undefined>();
  const [financeSection, setFinanceSection] =
    useState<FinanceSection>("simulateur");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [clients, leadsResponse, casesResponse, documents, notifications, audit, housing] =
        await Promise.all([
          readApi<{ clients: AdminClientProfile[]; overview: AdminOperationsOverview }>("/api/admin/clients"),
          readApi<{ leads: AdminLead[]; stats: AdminLeadStats }>("/api/admin/leads"),
          readApi<{ cases: ClientCase[] }>("/api/admin/cases"),
          readApi<{ documents: ClientDocument[] }>("/api/admin/documents"),
          readApi<{ notifications: AdminNotification[] }>("/api/admin/notifications"),
          readApi<{ events: AdminCaseEvent[] }>("/api/admin/audit"),
          readApi<{
            inventory: HousingInventoryItem[];
            autoIssuanceGloballyEnabled: boolean;
          }>("/api/admin/housing/inventory"),
        ]);
      setData({
        overview: clients.overview,
        leads: leadsResponse.leads,
        leadStats: leadsResponse.stats,
        clients: clients.clients,
        cases: casesResponse.cases,
        documents: documents.documents,
        notifications: notifications.notifications,
        events: audit.events,
        housingInventory: housing.inventory,
        housingAutoIssuanceGloballyEnabled: housing.autoIssuanceGloballyEnabled,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le cockpit opérations.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateHousingPolicy(
    inventoryId: string,
    input: Record<string, unknown>,
  ) {
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await writeApi<{ inventory: HousingInventoryItem }>(
        `/api/admin/housing/inventory/${encodeURIComponent(inventoryId)}`,
        input,
        "PATCH",
      );
      setData((current) => ({
        ...current,
        housingInventory: current.housingInventory.map((item) =>
          item.id === response.inventory.id ? response.inventory : item,
        ),
      }));
      setNotice("Règles de résidence mises à jour et journalisées.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Mise à jour de la résidence impossible.",
      );
      throw updateError;
    } finally {
      setIsBusy(false);
    }
  }

  async function loadClient(uid: string) {
    setSelectedUid(uid);
    setSelectedClient(null);
    setSelectedHousingRequest(null);
    setClientActionMessage(null);
    setError(null);
    try {
      const [response, housing] = await Promise.all([
        readApi<{ client: AdminClient360 }>(
          `/api/admin/clients/${encodeURIComponent(uid)}`,
        ),
        readApi<{ requests: HousingRequest[] }>(
          `/api/admin/housing/requests?ownerId=${encodeURIComponent(uid)}`,
        ),
      ]);
      setSelectedClient(response.client);
      setSelectedHousingRequest(housing.requests[0] ?? null);
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "Impossible de charger la fiche client.");
    }
  }

  async function approveHousing(
    requestId: string,
    input: HousingAllocationForm,
  ) {
    setIsBusy(true);
    setError(null);
    try {
      await writeApi(
        `/api/admin/housing/requests/${encodeURIComponent(requestId)}/approve-allocation`,
        input,
      );
      await refreshAfterAction(
        "Attribution partenaire confirmee et attestation generee.",
      );
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "Confirmation logement impossible.",
      );
      throw approvalError;
    } finally {
      setIsBusy(false);
    }
  }

  async function retryHousing(requestId: string) {
    setIsBusy(true);
    setError(null);
    try {
      await writeApi(
        `/api/admin/housing/requests/${encodeURIComponent(requestId)}/retry`,
      );
      await refreshAfterAction("Generation logement relancee.");
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Relance de generation impossible.",
      );
      throw retryError;
    } finally {
      setIsBusy(false);
    }
  }

  async function updateLeadCrm(leadId: string, input: AdminLeadUpdateInput) {
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await writeApi<{ lead: AdminLead }>(
        `/api/admin/leads/${encodeURIComponent(leadId)}`,
        input,
        "PATCH",
      );
      setData((current) => {
        const leads = current.leads.map((lead) =>
          lead.id === response.lead.id ? response.lead : lead,
        );

        return {
          ...current,
          leads,
          leadStats: summarizeLeadsForUi(leads),
        };
      });
      setNotice("Prospect CRM mis à jour.");
    } catch (leadError) {
      setError(
        leadError instanceof Error
          ? leadError.message
          : "Mise à jour CRM prospect impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function syncFirebaseUsers() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ result: { synced: number; created: number; updated: number } }>("/api/admin/operations/sync-auth-users");
      setNotice(`${response.result.synced} utilisateurs synchronisés (${response.result.created} nouveaux).`);
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Synchronisation Firebase impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function reconcileCases() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await writeApi<{ result: { checked: number; created: number; casesCreated?: number; casesUpdated?: number } }>("/api/admin/operations/reconcile-cases");
      const created = response.result.casesCreated ?? response.result.created;
      const checked = response.result.casesUpdated ?? response.result.checked;
      setNotice(`${checked} dossiers contrôlés, ${created} dossiers créés.`);
      await load();
      if (selectedUid) await loadClient(selectedUid);
    } catch (reconcileError) {
      setError(reconcileError instanceof Error ? reconcileError.message : "Réconciliation dossiers impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  function openAction(nextAction: ClientAction, clientCase: ClientCase | null) {
    if (!clientCase) {
      setClientActionMessage(actionRequiresCaseMessage(actionButtonLabels[nextAction]));
      setError(null);
      return;
    }
    setClientActionMessage(null);
    setError(null);
    setAction(nextAction);
    setActionCase(clientCase);
    setMessage("");
    setTitle("");
    setDocumentType("passport");
  }

  async function refreshAfterAction(success: string) {
    setAction(null);
    setClientActionMessage(null);
    setNotice(normalizeActionNotice(success));
    await load();
    if (selectedUid) await loadClient(selectedUid);
  }

  async function runClientAction() {
    if (!action || !actionCase) return;
    setIsBusy(true);
    setError(null);
    try {
      if (action === "request-document") {
        await writeApi(`/api/admin/cases/${actionCase.id}/request-document`, {
          documentType,
          message: message || undefined,
        });
        await refreshAfterAction("Demande documentaire créée.");
      } else if (action === "add-note") {
        await writeApi(`/api/admin/cases/${actionCase.id}/notes`, { note: message || "Note interne ajoutée." });
        await refreshAfterAction("Note interne ajoutée.");
      } else if (action === "send-notification") {
        await writeApi(`/api/admin/cases/${actionCase.id}/notifications`, {
          channel: "internal",
          title: title || "Notification dossier",
          body: message || "Action admin enregistrée.",
        });
        await refreshAfterAction("Notification enregistrée.");
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action client impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function markUnderReview(clientCase: ClientCase | null) {
    if (!clientCase) {
      setClientActionMessage(actionRequiresCaseMessage("Marquer en revue"));
      setError(null);
      return;
    }
    setIsBusy(true);
    setClientActionMessage(null);
    setError(null);
    try {
      await writeApi(`/api/admin/cases/${clientCase.id}/status`, { status: "UNDER_REVIEW" }, "PATCH");
      await refreshAfterAction("Dossier marqué en revue.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Mise en revue impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function generateCertificate(clientCase: ClientCase | null) {
    if (!clientCase) {
      setClientActionMessage(actionRequiresCaseMessage("Générer attestation"));
      setError(null);
      return;
    }
    setIsBusy(true);
    setClientActionMessage(null);
    setError(null);
    try {
      const result = await writeApi<CertificateGenerationResult>(
        `/api/admin/cases/${clientCase.id}/certificates`,
        {
        certificateType: "accommodation_certificate",
        },
      );
      if (!result.generated) {
        const message = certificateGenerationMessage(result);
        await load();
        if (selectedUid) await loadClient(selectedUid);

        if (result.reason === "certificate_already_exists") {
          setNotice(message);
        } else {
          setNotice(null);
          setError(message);
        }
        return;
      }
      await refreshAfterAction("Attestation générée.");
    } catch (certificateError) {
      setError(
        certificateError instanceof Error
          ? certificateError.message
          : "Génération attestation impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function openFinance(
    clientUid: string,
    section: FinanceSection,
    clientCase: ClientCase | null,
  ) {
    if (!clientCase) {
      setClientActionMessage(actionRequiresCaseMessage(financeSectionLabels[section]));
      setError(null);
      return;
    }

    setClientActionMessage(null);
    setFinanceClientUid(clientUid);
    setFinanceSection(section);
    setSelectedUid(null);
    setSelectedClient(null);
    setActive("finance");
  }

  async function verifyDocument(documentId: string, verificationStatus: "APPROVED" | "REJECTED") {
    setIsBusy(true);
    setError(null);
    try {
      if (verificationStatus === "REJECTED") {
        const rejectionReason = window.prompt("Motif du rejet à communiquer au dossier admin ?");
        if (!rejectionReason?.trim()) throw new Error("Le motif de rejet est obligatoire.");
        await writeApi("/api/admin/documents/reject", { documentId, rejectionReason });
      } else {
        await writeApi("/api/admin/documents/approve", { documentId });
      }
      await refreshAfterAction(verificationStatus === "APPROVED" ? "Document approuvé." : "Document rejeté.");
    } catch (documentError) {
      setError(documentError instanceof Error ? documentError.message : "Vérification document impossible.");
    } finally {
      setIsBusy(false);
    }
  }

  async function logoutAdmin() {
    setIsBusy(true);
    try {
      await fetch("/api/admin/session/logout", { method: "POST", cache: "no-store", credentials: "same-origin" });
      window.location.assign("/admin/login");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const clientByUid = useMemo(() => new Map(data.clients.map((client) => [client.uid, client])), [data.clients]);
  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data.clients;
    return data.clients.filter((client) =>
      `${client.fullName ?? ""} ${client.email ?? ""} ${client.phone ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [data.clients, query]);
  const selectedCases = selectedClient?.cases ?? [];
  const selectedDocuments = selectedClient?.documents ?? [];
  const selectedFinancialFiles = selectedClient?.financialFiles ?? [];
  const selectedTimeline = selectedClient?.timeline ?? [];
  const selectedCommunications = selectedClient?.communications ?? [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-[hsl(222,75%,8%)] text-white xl:block">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold">AVI CERTIFY</p>
                <p className="text-xs text-slate-300">Super Admin OS</p>
              </div>
            </div>
            <nav className="mt-8 space-y-1" aria-label="Super admin navigation">
              {tabs.map(([label, key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    active === key ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  Session admin vérifiée - {adminRole}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  AVI CERTIFY Super Admin Operations OS
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Clients, dossiers, documents, paiements, finance et audit opérationnel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {adminEmail ?? "Admin sécurisé"}
                </span>
                <Button type="button" variant="ghost" onClick={load}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Actualiser
                </Button>
                <Button type="button" variant="outline" disabled={isBusy} onClick={logoutAdmin}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Fermer session admin
                </Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 lg:px-8 xl:hidden">
              {tabs.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${
                    active === key ? "border-slate-950 bg-slate-950 text-white" : "bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="px-4 py-6 lg:px-8">
            {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{error}</div> : null}
            {notice ? <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">{notice}</div> : null}

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-white/80" />)}
              </div>
            ) : null}

            {!isLoading && active === "overview" ? (
              <OverviewPanel data={data} />
            ) : null}

            {!isLoading && active === "leads" ? (
              <AdminLeadsPanel
                leads={data.leads}
                stats={data.leadStats}
                isBusy={isBusy}
                onUpdateLead={updateLeadCrm}
              />
            ) : null}

            {!isLoading && active === "clients" ? (
              <section className="space-y-6" aria-labelledby="clients-title">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <h2 id="clients-title" className="text-xl font-semibold">Clients</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Profils synchronisés depuis Firebase Auth et structurés autour des dossiers AVI CERTIFY.
                    </p>
                  </div>
                  <label className="relative block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input className="pl-9 lg:w-80" placeholder="Rechercher nom, email, téléphone" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </label>
                </div>
                <ClientsTable clients={filteredClients} cases={data.cases} selectedUid={selectedUid} onSelect={loadClient} />
                <Client360Drawer
                  selectedUid={selectedUid}
                  client={selectedClient}
                  cases={selectedCases}
                  documents={selectedDocuments}
                  financialFiles={selectedFinancialFiles}
                  events={selectedTimeline}
                  communications={selectedCommunications}
                  housingRequest={selectedHousingRequest}
                  isBusy={isBusy}
                  actionMessage={clientActionMessage}
                  onCreateCase={reconcileCases}
                  onMarkUnderReview={markUnderReview}
                  onGenerateCertificate={generateCertificate}
                  onOpenAction={openAction}
                  onOpenFinance={openFinance}
                  onApproveHousing={approveHousing}
                  onRetryHousing={retryHousing}
                  onClose={() => {
                    setSelectedUid(null);
                    setSelectedClient(null);
                    setSelectedHousingRequest(null);
                    setClientActionMessage(null);
                  }}
                />
              </section>
            ) : null}

            {!isLoading && active === "cases" ? <CasesPanel cases={data.cases} clientByUid={clientByUid} /> : null}
            {!isLoading && active === "documents" ? <DocumentsPanel documents={data.documents} clientByUid={clientByUid} onVerify={verifyDocument} onOpenClient={loadClient} /> : null}
            {!isLoading && active === "payments" ? <OperationsPlaceholder title="Paiements" text="Rapprochement opérationnel des paiements par dossier, sans modifier le flux Stripe existant." empty="Aucun paiement opérationnel à traiter" /> : null}
            {!isLoading && active === "finance" ? (
              <FintechCommandCenter
                key={`${financeClientUid ?? "all"}-${financeSection}`}
                clients={data.clients}
                cases={data.cases}
                initialClientUid={financeClientUid}
                initialSection={financeSection}
              />
            ) : null}
            {!isLoading && active === "certificates" ? (
              <CertificatesPanel
                documents={data.documents}
                clientByUid={clientByUid}
              />
            ) : null}
            {!isLoading && active === "housing" ? (
              <HousingInventoryPanel
                inventory={data.housingInventory}
                globalAutoIssuanceEnabled={
                  data.housingAutoIssuanceGloballyEnabled
                }
                isBusy={isBusy}
                onUpdate={updateHousingPolicy}
              />
            ) : null}
            {!isLoading && active === "notifications" ? <NotificationsPanel notifications={data.notifications} /> : null}
            {!isLoading && active === "audit" ? <AuditPanel events={data.events} /> : null}
            {!isLoading && active === "settings" ? (
              <SettingsPanel adminRole={adminRole} isBusy={isBusy} onSync={syncFirebaseUsers} onReconcile={reconcileCases} />
            ) : null}
          </div>
          <ClientActionModal
            action={action}
            clientCase={actionCase}
            client={selectedClient?.profile ?? null}
            message={message}
            setMessage={setMessage}
            title={title}
            setTitle={setTitle}
            documentType={documentType}
            setDocumentType={setDocumentType}
            isBusy={isBusy}
            onClose={() => setAction(null)}
            onSubmit={runClientAction}
          />
        </section>
      </div>
    </main>
  );
}

function OverviewPanel({ data }: { data: OperationsData }) {
  return (
    <section className="space-y-6" aria-labelledby="overview-title">
      <div>
        <h2 id="overview-title" className="text-xl font-semibold">Vue d'ensemble opérations</h2>
        <p className="mt-1 text-sm text-slate-600">
          Données issues des APIs admin protégées. Aucune donnée client n'est lue via le SDK public.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Inscriptions aujourd'hui" value={data.overview?.newRegistrationsToday ?? 0} detail="Firebase Auth synchronisé" />
        <MetricCard label="Nouveaux dossiers" value={data.overview?.newCasesToday ?? 0} detail="Dossiers créés aujourd'hui" />
        <MetricCard label="Documents à vérifier" value={data.overview?.documentsAwaitingReview ?? 0} detail="En attente de revue admin" />
        <MetricCard label="Paiements en attente" value={data.overview?.paymentsPending ?? 0} detail="Suivi opérationnel" />
        <MetricCard label="Paiements confirmés" value={data.overview?.paymentsConfirmed ?? 0} detail="Dossiers payés" />
        <MetricCard label="Attestations générées" value={data.overview?.certificatesGenerated ?? 0} detail="Documents générés" />
        <MetricCard label="Dossiers bloqués" value={data.overview?.casesBlocked ?? 0} detail="Action admin requise" />
        <MetricCard label="Notifications non lues" value={data.overview?.unreadNotifications ?? 0} detail="File opérations" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <NotificationsPanel notifications={data.notifications.slice(0, 5)} />
        <AuditPanel events={data.events.slice(0, 5)} />
      </div>
    </section>
  );
}

function AdminLeadsPanel({
  leads,
  stats,
  isBusy,
  onUpdateLead,
}: {
  leads: AdminLead[];
  stats: AdminLeadStats | null;
  isBusy: boolean;
  onUpdateLead: (leadId: string, input: AdminLeadUpdateInput) => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<AdminLeadCrmStatus | "all">("all");
  const [identityFilter, setIdentityFilter] = useState<
    "all" | "linked" | "unlinked" | "needs-review"
  >("all");
  const [followUpFilter, setFollowUpFilter] = useState<
    "all" | "needs-review" | "overdue"
  >("all");
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [crmStatus, setCrmStatus] = useState<AdminLeadCrmStatus>("new");
  const [crmPriority, setCrmPriority] = useState<AdminLeadCrmPriority>("normal");
  const [crmOwner, setCrmOwner] = useState("");
  const [crmNotes, setCrmNotes] = useState("");
  const [lostReason, setLostReason] = useState<AdminLeadLostReason | "">("");
  const [nextAction, setNextAction] = useState<AdminLeadNextAction>("NONE");
  const [nextActionDueAt, setNextActionDueAt] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const effectiveStats = stats ?? summarizeLeadsForUi(leads);
  const filteredLeads = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.crmStatus !== statusFilter) {
        return false;
      }

      if (
        identityFilter === "linked" &&
        lead.identityLinkStatus !== "LINKED"
      ) {
        return false;
      }

      if (
        identityFilter === "unlinked" &&
        lead.identityLinkStatus !== "UNLINKED"
      ) {
        return false;
      }

      if (
        identityFilter === "needs-review" &&
        !["AMBIGUOUS", "CONFLICT"].includes(lead.identityLinkStatus)
      ) {
        return false;
      }

      if (followUpFilter === "needs-review" && !lead.humanFollowUpRequired) {
        return false;
      }

      if (
        followUpFilter === "overdue" &&
        !isLeadNextActionOverdue(lead.nextAction, lead.nextActionDueAt)
      ) {
        return false;
      }

      if (
        normalized &&
        !`${lead.fullName} ${lead.email} ${lead.phone ?? ""} ${lead.source}`.toLowerCase().includes(normalized)
      ) {
        return false;
      }

      return true;
    });
  }, [followUpFilter, identityFilter, leads, search, statusFilter]);
  const selectedLead =
    filteredLeads.find((lead) => lead.id === selectedLeadId) ??
    filteredLeads[0] ??
    leads[0] ??
    null;

  useEffect(() => {
    if (!selectedLead && selectedLeadId) {
      setSelectedLeadId(null);
    }

    if (!selectedLeadId && selectedLead) {
      setSelectedLeadId(selectedLead.id);
    }
  }, [selectedLead, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      return;
    }

    setCrmStatus(selectedLead.crmStatus);
    setCrmPriority(selectedLead.crmPriority);
    setCrmOwner(selectedLead.crmOwner ?? "");
    setCrmNotes(selectedLead.crmNotes ?? "");
    setLostReason(
      [
        "NO_RESPONSE",
        "NOT_INTERESTED",
        "NOT_ELIGIBLE",
        "DUPLICATE",
        "OUT_OF_SCOPE",
        "OTHER",
      ].includes(selectedLead.lostReason ?? "")
        ? (selectedLead.lostReason as AdminLeadLostReason)
        : "",
    );
    setNextAction(selectedLead.nextAction);
    setNextActionDueAt(toDateTimeLocal(selectedLead.nextActionDueAt));
    setFollowUpReason(selectedLead.followUpReason ?? "");
  }, [selectedLead]);

  const saveLead = async () => {
    if (!selectedLead) {
      return;
    }

    await onUpdateLead(selectedLead.id, {
      crmStatus,
      crmPriority,
      crmOwner: crmOwner || null,
      crmNotes: crmNotes || null,
      lostReason: crmStatus === "lost" ? lostReason || null : null,
      nextAction: crmStatus === "lost" ? "NONE" : nextAction,
      nextActionDueAt:
        crmStatus === "lost" || nextAction === "NONE"
          ? null
          : nextActionDueAt
            ? new Date(nextActionDueAt).toISOString()
            : null,
      followUpReason: followUpReason || null,
    });
  };

  return (
    <section className="space-y-6" aria-labelledby="leads-title">
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-end">
        <div>
          <h2 id="leads-title" className="text-xl font-semibold">
            Prospects CRM
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Leads marketing issus du guide et des campagnes. Aucun dossier
            opérationnel n'est créé depuis cette section.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[18rem_auto_auto_auto]">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              className="pl-9 sm:w-72"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher prospect"
              value={search}
            />
          </label>
          <select
            aria-label="Filtrer par statut CRM"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) =>
              setStatusFilter(event.target.value as AdminLeadCrmStatus | "all")
            }
            value={statusFilter}
          >
            <option value="all">Tous statuts</option>
            <option value="new">Nouveaux</option>
            <option value="contacted">Contactés</option>
            <option value="qualified">Qualifiés</option>
            <option value="converted">Convertis</option>
            <option value="lost">Perdus</option>
          </select>
          <select
            aria-label="Filtrer par identité"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) =>
              setIdentityFilter(
                event.target.value as typeof identityFilter,
              )
            }
            value={identityFilter}
          >
            <option value="all">Toutes identités</option>
            <option value="linked">Comptes liés</option>
            <option value="unlinked">Non rapprochés</option>
            <option value="needs-review">Liens à revoir</option>
          </select>
          <select
            aria-label="Filtrer par suivi"
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            onChange={(event) =>
              setFollowUpFilter(event.target.value as typeof followUpFilter)
            }
            value={followUpFilter}
          >
            <option value="all">Tous suivis</option>
            <option value="needs-review">Intervention requise</option>
            <option value="overdue">Actions en retard</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Total leads" value={effectiveStats.total} detail="Prospects marketing" />
        <MetricCard label="Nouveaux" value={effectiveStats.new} detail="À traiter" />
        <MetricCard label="Contactés" value={effectiveStats.contacted} detail="Relance engagée" />
        <MetricCard label="Qualifiés" value={effectiveStats.qualified} detail="Intérêt confirmé" />
        <MetricCard label="Convertis" value={effectiveStats.converted} detail="Conversion CRM" />
        <MetricCard label="Perdus" value={effectiveStats.lost} detail="Hors cible" />
        <MetricCard label="Guide prêt" value={effectiveStats.guideSucceeded} detail="Livraison guide" />
      </div>

      {!leads.length ? (
        <EmptyState
          title="Aucun prospect capturé"
          text="Les demandes de guide apparaîtront ici après capture dans la collection leads."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <section className="overflow-x-auto rounded-lg border bg-white shadow-sm">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Projet</th>
                  <th className="px-4 py-3">Identité / profil</th>
                  <th className="px-4 py-3">Attribution</th>
                  <th className="px-4 py-3">Guide</th>
                  <th className="px-4 py-3">Suivi</th>
                  <th className="px-4 py-3">CRM</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLeads.map((lead) => (
                  <tr
                    className={lead.id === selectedLead?.id ? "bg-emerald-50/60" : undefined}
                    key={lead.id}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{lead.fullName}</p>
                      <p className="text-slate-600">{lead.email}</p>
                      <p className="text-xs text-slate-500">{lead.phone ?? "Téléphone non renseigné"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{lead.serviceInterest ?? "Service non précisé"}</p>
                      <p className="text-xs text-slate-500">
                        {lead.destinationCountry ?? "Destination non précisée"} · {lead.projectHorizon ?? "horizon libre"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {identityLinkStatusLabel(lead.identityLinkStatus)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {profileReadinessLabel(lead.profileReadiness)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {qualificationReadinessLabel(lead.qualificationReadiness)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{lead.source}</p>
                      <p className="text-xs text-slate-500">
                        {lead.utmSource ?? "-"} / {lead.utmMedium ?? "-"} / {lead.utmCampaign ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{lead.guideDeliveryStatus ?? "-"}</p>
                      <p className="text-xs text-slate-500">{lead.guideEmailStatus ?? "email guide non tracé"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{nextActionLabel(lead.nextAction)}</p>
                      <p
                        className={
                          isLeadNextActionOverdue(
                            lead.nextAction,
                            lead.nextActionDueAt,
                          )
                            ? "text-xs font-semibold text-red-700"
                            : "text-xs text-slate-500"
                        }
                      >
                        {lead.nextActionDueAt
                          ? formatDate(lead.nextActionDueAt)
                          : "Sans échéance"}
                      </p>
                      {lead.humanFollowUpRequired ? (
                        <p className="mt-1 text-xs font-semibold text-amber-700">
                          Revue humaine
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                        {crmStatusLabel(lead.crmStatus)}
                      </span>
                      <p className="mt-2 text-xs text-slate-500">
                        Priorité {crmPriorityLabel(lead.crmPriority).toLowerCase()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => setSelectedLeadId(lead.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Ouvrir CRM
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedLead ? (
            <aside className="rounded-lg border bg-white p-5 shadow-sm" aria-label="Détail prospect CRM">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-700">
                    Prospect marketing
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{selectedLead.fullName}</h3>
                  <p className="text-sm text-slate-600">{selectedLead.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                  {selectedLead.source}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatusBadge label="Créé le" value={formatDate(selectedLead.createdAt)} />
                <StatusBadge label="Consentement marketing" value={selectedLead.marketingConsent ? "Oui" : "Non"} />
                <StatusBadge label="Pays" value={selectedLead.country ?? "-"} />
                <StatusBadge label="Destination" value={selectedLead.destinationCountry ?? "-"} />
                <StatusBadge
                  label="Rapprochement"
                  value={identityLinkStatusLabel(selectedLead.identityLinkStatus)}
                />
                <StatusBadge
                  label="Compte lié"
                  value={linkedUidLabel(selectedLead.linkedUid)}
                />
                <StatusBadge
                  label="Méthode"
                  value={linkMethodLabel(selectedLead.linkMethod)}
                />
                <StatusBadge
                  label="Email vérifié"
                  value={
                    selectedLead.linkedAccountEmailVerified == null
                      ? "Non disponible"
                      : selectedLead.linkedAccountEmailVerified
                        ? "Oui"
                        : "Non"
                  }
                />
                <StatusBadge
                  label="Profil"
                  value={profileReadinessLabel(selectedLead.profileReadiness)}
                />
                <StatusBadge
                  label="Données qualification"
                  value={qualificationReadinessLabel(
                    selectedLead.qualificationReadiness,
                  )}
                />
                <StatusBadge
                  label="Complétude profil"
                  value={
                    selectedLead.profileCompletionPercent == null
                      ? "Non disponible"
                      : `${selectedLead.profileCompletionPercent} %`
                  }
                />
              </div>

              {selectedLead.humanFollowUpRequired ? (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Intervention humaine requise</p>
                  <p className="mt-1 text-amber-800">
                    {selectedLead.identityLinkStatus === "AMBIGUOUS" ||
                    selectedLead.identityLinkStatus === "CONFLICT"
                      ? "Le rapprochement d’identité doit être revu avant toute décision commerciale."
                      : "Les données permettent une revue commerciale, mais le prospect n’a pas encore été contacté."}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold">Lecture de qualification</p>
                {selectedLead.qualificationMissingFields.length ? (
                  <p className="mt-2 text-slate-600">
                    À compléter : {selectedLead.qualificationMissingFields.join(", ")}.
                  </p>
                ) : (
                  <p className="mt-2 text-slate-600">
                    Nom, email, téléphone, destination et service sont disponibles.
                    La qualification reste une décision humaine.
                  </p>
                )}
                {selectedLead.qualificationReasons.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {selectedLead.qualificationReasons.map((reason) => (
                      <li
                        className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                        key={reason}
                      >
                        {qualificationReasonLabel(reason)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
                <p className="font-semibold">Attribution marketing</p>
                <dl className="mt-3 grid gap-2 text-slate-700">
                  <div className="flex justify-between gap-3">
                    <dt>UTM source</dt>
                    <dd>{selectedLead.utmSource ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>UTM medium</dt>
                    <dd>{selectedLead.utmMedium ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>UTM campaign</dt>
                    <dd>{selectedLead.utmCampaign ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Referrer</dt>
                    <dd className="max-w-56 truncate">{selectedLead.referrer ?? "-"}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-medium">
                  Statut CRM
                  <select
                    aria-label="Statut CRM"
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                    onChange={(event) => setCrmStatus(event.target.value as AdminLeadCrmStatus)}
                    value={crmStatus}
                  >
                    {(
                      [
                        ["new", "Nouveau"],
                        ["contacted", "Contacté"],
                        ["qualified", "Qualifié"],
                        ["converted", "Converti (hors Phase 2C)"],
                        ["lost", "Perdu"],
                      ] as const
                    ).map(([value, label]) => (
                      <option
                        disabled={
                          !canTransitionLeadCrmStatus(
                            selectedLead.crmStatus,
                            value,
                          )
                        }
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-normal text-slate-500">
                    La qualification reste une décision admin explicite. Aucun
                    statut client n’est créé ici.
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Priorité
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                    onChange={(event) => setCrmPriority(event.target.value as AdminLeadCrmPriority)}
                    value={crmPriority}
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Owner CRM
                  <Input
                    onChange={(event) => setCrmOwner(event.target.value)}
                    placeholder="Admin responsable"
                    value={crmOwner}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Notes internes
                  <textarea
                    className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    onChange={(event) => setCrmNotes(event.target.value)}
                    placeholder="Notes commerciales internes, sans créer de dossier"
                    value={crmNotes}
                  />
                </label>

                {crmStatus === "lost" ? (
                  <label className="grid gap-2 text-sm font-medium">
                    Raison de perte
                    <select
                      className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                      onChange={(event) =>
                        setLostReason(
                          event.target.value as AdminLeadLostReason | "",
                        )
                      }
                      value={lostReason}
                    >
                      <option value="">Sélectionner une raison</option>
                      <option value="NO_RESPONSE">Aucune réponse</option>
                      <option value="NOT_INTERESTED">Non intéressé</option>
                      <option value="NOT_ELIGIBLE">Non éligible</option>
                      <option value="DUPLICATE">Doublon</option>
                      <option value="OUT_OF_SCOPE">Hors périmètre</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </label>
                ) : null}

                <label className="grid gap-2 text-sm font-medium">
                  Prochaine action
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                    disabled={crmStatus === "lost"}
                    onChange={(event) =>
                      setNextAction(event.target.value as AdminLeadNextAction)
                    }
                    value={crmStatus === "lost" ? "NONE" : nextAction}
                  >
                    <option value="NONE">Aucune</option>
                    <option value="CALL_PROSPECT">Appeler le prospect</option>
                    <option value="WHATSAPP_PROSPECT">WhatsApp</option>
                    <option value="EMAIL_PROSPECT">Email</option>
                    <option value="REQUEST_INFORMATION">Demander des informations</option>
                    <option value="REVIEW_PROFILE">Revoir le profil</option>
                    <option value="REVIEW_AMBIGUOUS_LINK">Revoir le rapprochement</option>
                    <option value="FOLLOW_UP">Relancer</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Échéance
                  <Input
                    disabled={crmStatus === "lost" || nextAction === "NONE"}
                    onChange={(event) => setNextActionDueAt(event.target.value)}
                    type="datetime-local"
                    value={nextActionDueAt}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Motif de suivi
                  <Input
                    onChange={(event) => setFollowUpReason(event.target.value)}
                    placeholder="Contexte court pour la prochaine action"
                    value={followUpReason}
                  />
                </label>

                <Button
                  disabled={isBusy || (crmStatus === "lost" && !lostReason)}
                  onClick={saveLead}
                  type="button"
                  variant="cta"
                >
                  Sauvegarder CRM
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ClientsTable({
  clients,
  cases,
  selectedUid,
  onSelect,
}: {
  clients: AdminClientProfile[];
  cases: ClientCase[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
}) {
  if (!clients.length) {
    return (
      <EmptyState
        title="Aucun client synchronisé"
        text="Utilisez la synchronisation Firebase dans Paramètres admin pour importer les utilisateurs existants."
      />
    );
  }

  return (
    <section className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {["Client", "Email", "Téléphone", "Dossier", "Produit", "Statut", "Documents", "Paiement", "Finance", "Attestation", "Action suivante", "Dernière activité", "Action"].map((header) => (
              <th key={header} className="px-4 py-3">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const currentCase = cases.find((clientCase) => clientCase.uid === client.uid);
            return (
              <tr
                key={client.uid}
                data-selected={selectedUid === client.uid ? "true" : "false"}
                className={`border-t align-top ${selectedUid === client.uid ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : ""}`}
              >
                <td className="px-4 py-3 font-semibold">{displayClientName(client)}</td>
                <td className="px-4 py-3">{client.email ?? "-"}</td>
                <td className="px-4 py-3">{client.phone ?? "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{currentCase?.caseNumber ?? "À créer"}</td>
                <td className="px-4 py-3">{productLabel(currentCase?.productType)}</td>
                <td className="px-4 py-3">{statusLabel(currentCase?.status)}</td>
                <td className="px-4 py-3">{statusLabel(currentCase?.documentStatus)}</td>
                <td className="px-4 py-3">{statusLabel(currentCase?.paymentStatus)}</td>
                <td className="px-4 py-3">{statusLabel(currentCase?.financeStatus)}</td>
                <td className="px-4 py-3">{statusLabel(currentCase?.certificateStatus)}</td>
                <td className="px-4 py-3">{currentCase ? currentCase.nextAction ?? "Qualifier la demande client" : "Aucun dossier opérationnel"}</td>
                <td className="px-4 py-3">{formatDate(currentCase?.updatedAt ?? client.lastLoginAt ?? client.updatedAt)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => onSelect(client.uid)}>
                    Ouvrir 360
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Client360Drawer({
  selectedUid,
  client,
  cases,
  documents,
  financialFiles,
  events,
  communications,
  housingRequest,
  isBusy,
  actionMessage,
  onCreateCase,
  onMarkUnderReview,
  onGenerateCertificate,
  onOpenAction,
  onOpenFinance,
  onApproveHousing,
  onRetryHousing,
  onClose,
}: {
  selectedUid: string | null;
  client: AdminClient360 | null;
  cases: ClientCase[];
  documents: ClientDocument[];
  financialFiles: ClientFinancialFile[];
  events: AdminCaseEvent[];
  communications: CommunicationLog[];
  housingRequest: HousingRequest | null;
  isBusy: boolean;
  actionMessage: string | null;
  onCreateCase: () => void;
  onMarkUnderReview: (clientCase: ClientCase | null) => void;
  onGenerateCertificate: (clientCase: ClientCase | null) => void;
  onOpenAction: (action: ClientAction, clientCase: ClientCase | null) => void;
  onOpenFinance: (
    clientUid: string,
    section: FinanceSection,
    clientCase: ClientCase | null,
  ) => void;
  onApproveHousing: (
    requestId: string,
    input: HousingAllocationForm,
  ) => Promise<void>;
  onRetryHousing: (requestId: string) => Promise<void>;
  onClose: () => void;
}) {
  if (!selectedUid) return null;
  if (!client?.profile) {
    return (
      <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
        <EmptyState title="Chargement de la fiche client" text="La vue 360 client va apparaître dès que l'API admin répond." />
      </aside>
    );
  }

  const profile = client.profile;
  const currentCase = housingRequest
    ? cases.find((item) => item.id === housingRequest.caseId) ?? cases[0] ?? null
    : cases[0] ?? null;
  const documentDiagnostics = client.documentDiagnostics;
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-4xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" aria-labelledby="client-360-title">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 border-b bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 id="client-360-title" className="text-lg font-semibold">
              Client 360 - {displayClientName(client.profile)}
            </h3>
            <p className="text-sm text-slate-600">{client.profile.email ?? "Email non renseigné"}</p>
            <p className="mt-1 text-xs text-slate-500">
              Téléphone: {client.profile.phone ?? "-"} · Créé le {formatDate(client.profile.createdAt)}
            </p>
            {currentCase ? (
              <p className="mt-1 text-xs text-slate-500">
                Dossier: {currentCase.caseNumber} · Statut: {statusLabel(currentCase.status)}
              </p>
            ) : null}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>Fermer fiche 360</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dossiers" value={cases.length} detail="Cas client rattachés" />
        <MetricCard label="Documents" value={documents.length} detail="Pièces visibles admin" />
        <MetricCard label="Notifications" value={communications.length} detail="Journal opérationnel" />
        <MetricCard label="Timeline" value={events.length} detail="Événements auditables" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <StatusBadge label="Action suivante" value={currentCase ? currentCase.nextAction ?? "Qualifier la demande client" : "Aucun dossier opérationnel"} />
        <StatusBadge label="Documents" value={statusLabel(currentCase?.documentStatus)} />
        <StatusBadge label="Paiement" value={statusLabel(currentCase?.paymentStatus)} />
        <StatusBadge label="Finance" value={statusLabel(currentCase?.financeStatus)} />
      </div>

      {actionMessage ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950" role="alert">
          <p>{actionMessage}</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onCreateCase}>
            Créer dossier opérationnel
          </Button>
        </div>
      ) : null}

      {!currentCase ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Dossier requis pour les actions Client 360</p>
          <p className="mt-1">
            Les actions document, notification, attestation, finance et devis nécessitent un dossier opérationnel relié au client.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <SectionList
          title="Identité"
          empty="Aucune identité enrichie"
          rows={[
            `Nom: ${displayClientName(client.profile)}`,
            `Email: ${client.profile.email ?? "-"}`,
            `Téléphone: ${client.profile.phone ?? "-"}`,
            `Pays: ${client.profile.destinationCountry ?? client.profile.countryOfOrigin ?? "-"}`,
          ]}
        />
        <SectionList
          title="Current Case"
          empty="Aucun dossier client"
          rows={cases.map((item) => `${item.caseNumber} · ${productLabel(item.productType)} · ${statusLabel(item.status)} · ${item.nextAction ?? "-"}`)}
          action={!cases.length ? <Button type="button" size="sm" onClick={onCreateCase}>Créer dossier opérationnel</Button> : null}
        />
        <DocumentsSummary documents={documents} cases={cases} />
        <PaymentsSummary caseItem={currentCase} />
        <HousingRequestSummary
          key={housingRequest?.id ?? "no-housing-request"}
          request={housingRequest}
          isBusy={isBusy}
          onApprove={onApproveHousing}
          onRetry={onRetryHousing}
        />
        <SectionList
          title="Finance"
          empty="Aucune simulation, aucun devis ou rapport lié"
          rows={financialFiles.map(
            (file) =>
              `${file.status} · ${file.simulationId ?? "simulation -"} · ${file.quoteId ?? "devis -"} · ${file.reportId ?? "rapport -"}`,
          )}
        />
        <CertificatesSummary certificates={client.certificates} caseItem={currentCase} />
        <CommunicationsSummary communications={communications} />
        <SectionList title="Notes / Timeline" empty="Aucune activité récente" rows={events.map((item) => `${formatDate(item.createdAt)} · ${item.eventLabel}`)} />
        <details className="rounded-lg bg-slate-50 p-4">
          <summary className="cursor-pointer font-semibold">Détails techniques</summary>
          <dl className="mt-3 space-y-2 text-sm text-slate-700">
            <div><dt className="font-semibold">Projet Firebase</dt><dd className="font-mono text-xs">{documentDiagnostics.firebaseProjectId ?? "Non configuré"}</dd></div>
            <div><dt className="font-semibold">UID résolu</dt><dd className="font-mono text-xs">{documentDiagnostics.resolvedUid}</dd></div>
            <div><dt className="font-semibold">UID Firebase Auth</dt><dd className="font-mono text-xs">{documentDiagnostics.authUid ?? "Non résolu"}</dd></div>
            <div><dt className="font-semibold">Email</dt><dd className="break-all font-mono text-xs">{documentDiagnostics.email ?? "-"}</dd></div>
            <div><dt className="font-semibold">Case ID</dt><dd className="font-mono text-xs">{currentCase?.id ?? "-"}</dd></div>
            <div>
              <dt className="font-semibold">Firestore</dt>
              <dd className="text-xs">
                documents: {documentDiagnostics.firestoreCounts.documents} · client_documents: {documentDiagnostics.firestoreCounts.clientDocuments}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Storage</dt>
              <dd className="text-xs">
                {documentDiagnostics.storage.bucketName ?? "bucket non résolu"} · {documentDiagnostics.storage.status} · fichiers: {documentDiagnostics.storage.fileCount ?? "non vérifié"} · orphelins: {documentDiagnostics.storage.orphanedFileCount ?? "non vérifié"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Sources interrogées</dt>
              <dd className="break-words font-mono text-[11px] leading-5">{documentDiagnostics.sourcesQueried.join(" · ")}</dd>
            </div>
            <div><dt className="font-semibold">Dernier refresh</dt><dd className="text-xs">{formatDate(documentDiagnostics.lastRefresh)}</dd></div>
          </dl>
          <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700">
            {documentDiagnostics.message}
          </p>
          {documentDiagnostics.error ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900" role="alert">
              {documentDiagnostics.error}
            </p>
          ) : null}
        </details>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAction("request-document", currentCase)}>Demander document</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onMarkUnderReview(currentCase)}>Marquer en revue</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAction("add-note", currentCase)}>Ajouter note</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onGenerateCertificate(currentCase)}>Générer attestation</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenFinance(profile.uid, "simulateur", currentCase)}>Lier simulation</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenFinance(profile.uid, "devis", currentCase)}>Générer devis</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenFinance(profile.uid, "rapports", currentCase)}>Rapport préfinancement</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAction("send-notification", currentCase)}>Envoyer notification</Button>
      </div>
    </aside>
  );
}

function SectionList({ title, rows, empty, action }: { title: string; rows: string[]; empty: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        {action}
      </div>
      {rows.length ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {rows.slice(0, 8).map((row) => <li key={row}>{row}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-600">{empty}</p>
      )}
    </section>
  );
}

function DocumentsSummary({
  documents,
  cases,
}: {
  documents: ClientDocument[];
  cases: ClientCase[];
}) {
  const caseById = new Map(cases.map((item) => [item.id, item]));

  return (
    <section className="rounded-lg bg-slate-50 p-4 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">Documents client</h4>
          <p className="mt-1 text-xs text-slate-500">
            {documents.length} pièce{documents.length > 1 ? "s" : ""} visible{documents.length > 1 ? "s" : ""} par l&apos;admin
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          Accès admin protégé
        </span>
      </div>

      {documents.length ? (
        <div className="mt-4 grid gap-3">
          {documents.map((document) => {
            const hasFile =
              Boolean(document.storagePath) &&
              ["UPLOADED", "UNDER_REVIEW", "APPROVED"].includes(
                document.verificationStatus,
              );
            const relatedCase = document.caseId
              ? caseById.get(document.caseId)
              : null;
            const source =
              document.source === "ADMIN"
                ? "Généré par admin"
                : document.source === "SYSTEM"
                  ? "Document système"
                  : "Téléversé par client";
            const typeLabel =
              documentTypeLabels[
                document.documentType as keyof typeof documentTypeLabels
              ] ?? document.documentType;

            return (
              <article
                key={document.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                      <p className="font-semibold text-slate-950">{typeLabel}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {source}
                      </span>
                      {!hasFile ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Document manquant
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 break-all text-sm text-slate-700">
                      {document.fileName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Statut : {statusLabel(document.verificationStatus)} · Upload : {formatDate(document.uploadedAt ?? document.requestedAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Dossier : {relatedCase?.caseNumber ?? document.caseId ?? "Non rattaché à un dossier"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hasFile ? (
                      <>
                        <Button asChild type="button" size="sm" variant="outline">
                          <a
                            href={`/api/admin/documents/${encodeURIComponent(document.id)}/preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            Voir
                          </a>
                        </Button>
                        <Button asChild type="button" size="sm">
                          <a
                            href={`/api/admin/documents/${encodeURIComponent(document.id)}/download`}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Télécharger
                          </a>
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-amber-800">
                        Aucun fichier disponible
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Aucun document soumis ou demandé pour ce client.
        </p>
      )}
    </section>
  );
}

function HousingRequestSummary({
  request,
  isBusy,
  onApprove,
  onRetry,
}: {
  request: HousingRequest | null;
  isBusy: boolean;
  onApprove: (requestId: string, input: HousingAllocationForm) => Promise<void>;
  onRetry: (requestId: string) => Promise<void>;
}) {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  const expectedMonthlyRent =
    request?.selectionSnapshot?.pricing.clientMonthlyRent ??
    request?.selectionSnapshot?.pricing.monthlyRentForCertificate ??
    request?.indicativeMonthlyRent ??
    0;
  const [form, setForm] = useState<HousingAllocationForm>(() => ({
    inventoryReference: request?.selectionSnapshot?.internalReference ?? "",
    partnerName: request?.selectionSnapshot?.partnerName ?? "",
    residenceName: request?.selectionSnapshot?.residenceName ?? "",
    addressLine: request?.selectionSnapshot?.address.line1 ?? "",
    postalCode: request?.selectionSnapshot?.address.postalCode ?? "",
    city: request?.selectionSnapshot?.address.city ?? request?.preferredCity ?? "",
    accommodationType: request?.accommodationType ?? "studio",
    monthlyRent: expectedMonthlyRent,
    currency: "EUR",
    confirmedAt: todayInputValue(),
    confirmationReference: "",
    validUntil: validUntil.toISOString().slice(0, 10),
    allocationReason: "Disponibilite confirmee par le partenaire pour emission conditionnelle.",
    pricingOverrideReason: "",
  }));
  const pricingOverridden = form.monthlyRent !== expectedMonthlyRent;
  const canApprove = Boolean(
    request &&
      request.paymentId &&
      [
        "allocation_pending",
        "requires_admin_review",
        "admin_review_in_progress",
        "failed",
      ].includes(request.status),
  );

  if (!request) {
    return (
      <SectionList
        title="Logement conditionnel"
        empty="Aucune demande logement rattachee"
        rows={[]}
      />
    );
  }

  if (request.allocation) {
    return (
      <SectionList
        title="Logement conditionnel"
        empty="Aucune attribution"
        rows={[
          `Statut : ${request.status}`,
          `Ville : ${request.preferredCity}`,
          `Residence : ${request.selectionSnapshot?.residenceName ?? "selection historique"}`,
          `Decision : ${request.autoDecisionSnapshot?.eligible ? "automatique" : request.autoDecisionSnapshot?.reasons.join(", ") ?? "administrative"}`,
          `Adresse confirmee : ${request.allocation.addressLine}, ${request.allocation.postalCode} ${request.allocation.city}`,
          `Partenaire : ${request.allocation.partnerName}`,
          `Preuve : ${request.allocation.confirmationReference}`,
          `Document : ${request.generatedDocumentId ?? "generation en cours"}`,
        ]}
        action={
          request.status !== "certificate_delivered" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => void onRetry(request.id)}
            >
              Relancer generation / email
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <section className="rounded-lg bg-slate-50 p-4 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">Logement conditionnel</h4>
          <p className="mt-1 text-sm text-slate-600">
            {request.preferredCity} - statut {request.status} - demande {request.id}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Revue administrative par exception
        </span>
      </div>
      {!canApprove ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-white p-3 text-sm text-amber-900">
          Le paiement Stripe doit etre confirme avant toute attribution et emission.
        </p>
      ) : (
        <form
          className="mt-4 grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onApprove(request.id, form);
          }}
        >
          {([
            ["inventoryReference", "Reference inventaire"],
            ["partnerName", "Partenaire confirme"],
            ["residenceName", "Residence"],
            ["addressLine", "Adresse exacte"],
            ["postalCode", "Code postal"],
            ["city", "Ville"],
            ["confirmationReference", "Preuve / reference de confirmation"],
          ] as const).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-sm font-medium text-slate-700">
              {label}
              <Input
                required
                value={String(form[key])}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </label>
          ))}
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Type de logement
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3"
              value={form.accommodationType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  accommodationType: event.target.value as HousingAllocationForm["accommodationType"],
                }))
              }
            >
              <option value="studio">Studio</option>
              <option value="t1_bis">T1 bis</option>
              <option value="t2">T2</option>
              <option value="shared">Colocation</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Loyer mensuel EUR
            <Input
              type="number"
              min="1"
              step="0.01"
              required
              value={form.monthlyRent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  monthlyRent: Number(event.target.value),
                }))
              }
            />
          </label>
          {pricingOverridden ? (
            <label className="grid gap-1 text-sm font-medium text-amber-900 md:col-span-2">
              Motif obligatoire de modification du loyer
              <Textarea
                required
                maxLength={500}
                value={form.pricingOverrideReason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pricingOverrideReason: event.target.value,
                  }))
                }
              />
            </label>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Confirmation partenaire
            <Input
              type="date"
              required
              value={form.confirmedAt}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirmedAt: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Validite de l'attestation
            <Input
              type="date"
              required
              value={form.validUntil}
              onChange={(event) =>
                setForm((current) => ({ ...current, validUntil: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Motif d'attribution
            <Textarea
              required
              maxLength={500}
              value={form.allocationReason}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  allocationReason: event.target.value,
                }))
              }
            />
          </label>
          <div className="md:col-span-2">
            {request.autoDecisionSnapshot ? (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                Motifs du moteur : {request.autoDecisionSnapshot.reasons.join(", ")}
              </p>
            ) : null}
            <Button type="submit" disabled={isBusy}>
              {isBusy ? "Generation en cours..." : "Confirmer l'attribution et generer"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

function PaymentsSummary({ caseItem }: { caseItem: ClientCase | null }) {
  return <SectionList title="Payments" empty="Aucun paiement rapproché" rows={[`Statut: ${statusLabel(caseItem?.paymentStatus)}`]} />;
}

function CertificatesSummary({ certificates, caseItem }: { certificates: Array<Record<string, unknown>>; caseItem: ClientCase | null }) {
  const rows = certificates.length
    ? certificates.map((certificate) => `${String(certificate.documentType ?? "certificate")} · ${String(certificate.status ?? "-")}`)
    : [`Statut: ${statusLabel(caseItem?.certificateStatus)}`];
  return <SectionList title="Certificates / AVI" empty="Aucune attestation générée" rows={rows} />;
}

function CommunicationsSummary({ communications }: { communications: CommunicationLog[] }) {
  const rows = communications.map(
    (item) =>
      `${formatDate(item.createdAt)} - ${item.template ?? item.type} - ${item.recipient ?? "destinataire interne"} - ${statusLabel(item.status)}`,
  );
  return <SectionList title="Communications" empty="Aucune communication envoyée" rows={rows} />;
}

function CasesPanel({ cases, clientByUid }: { cases: ClientCase[]; clientByUid: Map<string, AdminClientProfile> }) {
  return (
    <section className="space-y-4" aria-labelledby="cases-title">
      <h2 id="cases-title" className="text-xl font-semibold">Dossiers</h2>
      {cases.length ? (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Dossier", "Client", "Produit", "Statut", "Documents", "Paiement", "Finance", "Attestation", "Priorité", "Action suivante", "Mis à jour"].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((clientCase) => {
                const client = clientByUid.get(clientCase.uid);
                return (
                  <tr key={clientCase.id} className="border-t">
                    <td className="px-4 py-3 font-mono text-xs">{clientCase.caseNumber}</td>
                    <td className="px-4 py-3">{client ? displayClientName(client) : clientCase.clientName ?? clientCase.clientEmail ?? "Client à identifier"}</td>
                    <td className="px-4 py-3">{productLabel(clientCase.productType)}</td>
                    <td className="px-4 py-3">{statusLabel(clientCase.status)}</td>
                    <td className="px-4 py-3">{statusLabel(clientCase.documentStatus)}</td>
                    <td className="px-4 py-3">{statusLabel(clientCase.paymentStatus)}</td>
                    <td className="px-4 py-3">{statusLabel(clientCase.financeStatus)}</td>
                    <td className="px-4 py-3">{statusLabel(clientCase.certificateStatus)}</td>
                    <td className="px-4 py-3">{clientCase.priority ?? "NORMAL"}</td>
                    <td className="px-4 py-3">{clientCase.nextAction ?? "-"}</td>
                    <td className="px-4 py-3">{formatDate(clientCase.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Aucun dossier créé" text="Les dossiers clients apparaîtront ici après synchronisation et réconciliation." />
      )}
    </section>
  );
}

type HousingPolicyForm = {
  inventoryStatus: HousingInventoryItem["inventoryStatus"];
  isVisibleToClients: boolean;
  publicAddressFormattedAddress: string;
  publicAddressDisplayToClient: boolean;
  isEligibleForCertificate: boolean;
  priceValidationStatus: HousingInventoryItem["pricing"]["priceValidationStatus"];
  monthlyRentForCertificate: string;
  autoIssuanceEnabled: boolean;
  eligibilityStatus: HousingInventoryItem["autoIssuance"]["eligibilityStatus"];
  validUntil: string;
  conditionalCapacity: string;
  remainingConditionalCapacity: string;
  arrivalDateFrom: string;
  arrivalDateUntil: string;
  manualReviewRequired: boolean;
  stopReason: string;
  confirmationReference: string;
};

function toLocalDateTime(value?: string) {
  return value ? value.slice(0, 16) : "";
}

function HousingInventoryPanel({
  inventory,
  globalAutoIssuanceEnabled,
  isBusy,
  onUpdate,
}: {
  inventory: HousingInventoryItem[];
  globalAutoIssuanceEnabled: boolean;
  isBusy: boolean;
  onUpdate: (inventoryId: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = inventory.find((item) => item.id === selectedId) ?? null;
  const eligibleCount = inventory.filter(
    (item) => item.autoIssuance.enabled && item.autoIssuance.eligibilityStatus === "eligible",
  ).length;
  const reviewCount = inventory.filter(
    (item) =>
      !item.autoIssuance.enabled || item.autoIssuance.eligibilityStatus !== "eligible",
  ).length;

  return (
    <section className="space-y-5" aria-labelledby="housing-inventory-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="housing-inventory-title" className="text-xl font-semibold">
            Logements et règles d&apos;émission
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Inventaire Firestore issu d&apos;imports contrôlés. Une résidence importée reste en revue manuelle jusqu&apos;à une prévalidation explicite.
          </p>
        </div>
        <span
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            globalAutoIssuanceEnabled
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          Kill switch serveur : {globalAutoIssuanceEnabled ? "actif" : "désactivé"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Résidences" value={inventory.length} detail="Source opérationnelle Firestore" />
        <MetricCard label="Auto-éligibles" value={eligibleCount} detail="Prévalidées par un admin" />
        <MetricCard label="Revue manuelle" value={reviewCount} detail="Aucune émission automatique" />
      </div>
      {!inventory.length ? (
        <EmptyState
          title="Aucune résidence importée"
          text="Exécutez d'abord l'import contrôlé après validation du projet Firebase. Aucun classeur n'est lu par le navigateur."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Référence",
                  "Résidence",
                  "Ville",
                  "Loyer certificat",
                  "Inventaire",
                  "Automatisation",
                  "Validité",
                  "Capacité",
                  "Action",
                ].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="px-4 py-3 font-mono text-xs">{item.internalReference}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{item.residenceName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.partner.displayName}</p>
                  </td>
                  <td className="px-4 py-3">{item.cityLabel}</td>
                  <td className="px-4 py-3">
                    {item.pricing.monthlyRentForCertificate
                      ? `${item.pricing.monthlyRentForCertificate} EUR`
                      : "À valider"}
                  </td>
                  <td className="px-4 py-3">{item.inventoryStatus}</td>
                  <td className="px-4 py-3">
                    {item.autoIssuance.enabled ? "Activée" : "Revue manuelle"}
                  </td>
                  <td className="px-4 py-3">{formatDate(item.autoIssuance.validUntil)}</td>
                  <td className="px-4 py-3">
                    {item.autoIssuance.conditionalCapacity === undefined
                      ? "Sans quota"
                      : `${item.autoIssuance.remainingConditionalCapacity ?? 0}/${item.autoIssuance.conditionalCapacity}`}
                  </td>
                  <td className="px-4 py-3">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedId(item.id)}>
                      Configurer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected ? (
        <HousingPolicyEditor
          key={`${selected.id}-${selected.version}`}
          item={selected}
          isBusy={isBusy}
          onClose={() => setSelectedId(null)}
          onUpdate={onUpdate}
        />
      ) : null}
    </section>
  );
}

function HousingPolicyEditor({
  item,
  isBusy,
  onClose,
  onUpdate,
}: {
  item: HousingInventoryItem;
  isBusy: boolean;
  onClose: () => void;
  onUpdate: (inventoryId: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<HousingPolicyForm>({
    inventoryStatus: item.inventoryStatus,
    isVisibleToClients: item.isVisibleToClients,
    publicAddressFormattedAddress:
      item.publicAddress?.formattedAddress ?? item.address.formattedAddress,
    publicAddressDisplayToClient: item.publicAddress?.displayToClient ?? false,
    isEligibleForCertificate: item.isEligibleForCertificate,
    priceValidationStatus: item.pricing.priceValidationStatus,
    monthlyRentForCertificate: String(item.pricing.monthlyRentForCertificate ?? ""),
    autoIssuanceEnabled: item.autoIssuance.enabled,
    eligibilityStatus: item.autoIssuance.eligibilityStatus,
    validUntil: toLocalDateTime(item.autoIssuance.validUntil),
    conditionalCapacity: String(item.autoIssuance.conditionalCapacity ?? ""),
    remainingConditionalCapacity: String(
      item.autoIssuance.remainingConditionalCapacity ?? "",
    ),
    arrivalDateFrom: toLocalDateTime(item.autoIssuance.arrivalDateFrom),
    arrivalDateUntil: toLocalDateTime(item.autoIssuance.arrivalDateUntil),
    manualReviewRequired: item.autoIssuance.manualReviewRequired ?? true,
    stopReason: item.autoIssuance.stopReason ?? "",
    confirmationReference: item.availability.confirmationReference ?? "",
  });
  const update = <K extends keyof HousingPolicyForm,>(
    key: K,
    value: HousingPolicyForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const isoOrUndefined = (value: string) =>
    value ? new Date(value).toISOString() : undefined;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" aria-labelledby="housing-policy-title">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
        <div>
          <h3 id="housing-policy-title" className="text-lg font-semibold">Prévalidation - {item.residenceName}</h3>
          <p className="mt-1 text-sm text-slate-600">{item.internalReference} · {item.address.formattedAddress}</p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>Fermer</Button>
      </div>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void onUpdate(item.id, {
            inventoryStatus: form.inventoryStatus,
            isVisibleToClients: form.isVisibleToClients,
            publicAddressFormattedAddress: form.publicAddressFormattedAddress,
            publicAddressDisplayToClient: form.publicAddressDisplayToClient,
            isEligibleForCertificate: form.isEligibleForCertificate,
            priceValidationStatus: form.priceValidationStatus,
            ...(form.monthlyRentForCertificate
              ? { monthlyRentForCertificate: Number(form.monthlyRentForCertificate) }
              : {}),
            autoIssuanceEnabled: form.autoIssuanceEnabled,
            eligibilityStatus: form.eligibilityStatus,
            ...(form.validUntil ? { validUntil: isoOrUndefined(form.validUntil) } : {}),
            ...(form.conditionalCapacity
              ? { conditionalCapacity: Number(form.conditionalCapacity) }
              : {}),
            ...(form.remainingConditionalCapacity
              ? {
                  remainingConditionalCapacity: Number(
                    form.remainingConditionalCapacity,
                  ),
                }
              : {}),
            ...(form.arrivalDateFrom
              ? { arrivalDateFrom: isoOrUndefined(form.arrivalDateFrom) }
              : {}),
            ...(form.arrivalDateUntil
              ? { arrivalDateUntil: isoOrUndefined(form.arrivalDateUntil) }
              : {}),
            manualReviewRequired: form.manualReviewRequired,
            stopReason: form.stopReason,
            confirmationReference: form.confirmationReference,
          });
        }}
      >
        <label className="grid gap-1 text-sm font-medium">Statut inventaire
          <Select value={form.inventoryStatus} onChange={(event) => update("inventoryStatus", event.target.value as HousingPolicyForm["inventoryStatus"])}>
            {[
              "draft",
              "available",
              "conditionally_available",
              "confirmation_required",
              "unavailable",
              "suspended",
              "archived",
            ].map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Éligibilité
          <Select value={form.eligibilityStatus} onChange={(event) => update("eligibilityStatus", event.target.value as HousingPolicyForm["eligibilityStatus"])}>
            {[
              "eligible",
              "manual_review_only",
              "suspended",
              "expired",
            ].map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Validation du loyer
          <Select value={form.priceValidationStatus} onChange={(event) => update("priceValidationStatus", event.target.value as HousingPolicyForm["priceValidationStatus"])}>
            <option value="unverified">Non vérifié</option>
            <option value="requires_admin_review">À revoir</option>
            <option value="verified">Vérifié</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">Loyer certificat EUR
          <Input type="number" min="1" value={form.monthlyRentForCertificate} onChange={(event) => update("monthlyRentForCertificate", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Validité automatique
          <Input type="datetime-local" value={form.validUntil} onChange={(event) => update("validUntil", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Référence de confirmation
          <Input value={form.confirmationReference} onChange={(event) => update("confirmationReference", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2">Adresse publique validée
          <Input value={form.publicAddressFormattedAddress} onChange={(event) => update("publicAddressFormattedAddress", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Quota conditionnel
          <Input type="number" min="1" value={form.conditionalCapacity} onChange={(event) => update("conditionalCapacity", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Capacité restante
          <Input type="number" min="0" value={form.remainingConditionalCapacity} onChange={(event) => update("remainingConditionalCapacity", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Arrivées autorisées à partir de
          <Input type="datetime-local" value={form.arrivalDateFrom} onChange={(event) => update("arrivalDateFrom", event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm font-medium">Arrivées autorisées jusqu&apos;au
          <Input type="datetime-local" value={form.arrivalDateUntil} onChange={(event) => update("arrivalDateUntil", event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.isVisibleToClients} onChange={(event) => update("isVisibleToClients", event.target.checked)} /> Visible aux clients
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.publicAddressDisplayToClient} onChange={(event) => update("publicAddressDisplayToClient", event.target.checked)} /> Afficher l&apos;adresse publique validée
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.isEligibleForCertificate} onChange={(event) => update("isEligibleForCertificate", event.target.checked)} /> Éligible au certificat
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.autoIssuanceEnabled} onChange={(event) => update("autoIssuanceEnabled", event.target.checked)} /> Émission automatique
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.manualReviewRequired} onChange={(event) => update("manualReviewRequired", event.target.checked)} /> Revue manuelle imposée
        </label>
        <label className="grid gap-1 text-sm font-medium md:col-span-2">Motif d&apos;arrêt / note
          <Textarea value={form.stopReason} maxLength={500} onChange={(event) => update("stopReason", event.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" disabled={isBusy}>Enregistrer la prévalidation</Button>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() =>
              void onUpdate(item.id, {
                inventoryStatus: "suspended",
                autoIssuanceEnabled: false,
                eligibilityStatus: "suspended",
                manualReviewRequired: true,
                stopReason: "Suspension immédiate décidée par l'administrateur.",
              })
            }
          >
            Suspendre immédiatement
          </Button>
        </div>
      </form>
    </aside>
  );
}

function CertificatesPanel({
  documents,
  clientByUid,
}: {
  documents: ClientDocument[];
  clientByUid: Map<string, AdminClientProfile>;
}) {
  const certificates = documents.filter((document) =>
    document.documentType.includes("certificate"),
  );

  return (
    <section className="space-y-4" aria-labelledby="certificates-title">
      <div>
        <h2 id="certificates-title" className="text-xl font-semibold">
          Attestations / AVI
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Attestations reellement generees et rattachees aux dossiers clients.
        </p>
      </div>
      <ManualAviGeneratorPanel />
      {certificates.length ? (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Client", "Email", "Dossier", "Type", "Fichier", "Statut", "Generee le"].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => {
                const client = clientByUid.get(certificate.uid);

                return (
                  <tr key={certificate.id} className="border-t">
                    <td className="px-4 py-3 font-semibold">
                      {client ? displayClientName(client) : certificate.clientName ?? "Client a identifier"}
                    </td>
                    <td className="px-4 py-3">{client?.email ?? certificate.clientEmail ?? "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{certificate.caseId ?? "-"}</td>
                    <td className="px-4 py-3">{certificate.documentType}</td>
                    <td className="px-4 py-3">{certificate.fileName}</td>
                    <td className="px-4 py-3">{statusLabel(certificate.verificationStatus)}</td>
                    <td className="px-4 py-3">{formatDate(certificate.uploadedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Aucune attestation generee"
          text="Les attestations apparaissent ici uniquement apres une generation reussie."
        />
      )}
    </section>
  );
}

function compactManualAviPayload(form: ManualAviFormState) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(form)) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    payload[key] =
      key === "aviAmount" ? Number(trimmed.replace(/\s/g, "").replace(",", ".")) : trimmed;
  }

  return payload;
}

async function readManualAviError(response: Response) {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // The route normally returns JSON on errors, but keep a safe fallback.
  }

  return "Generation AVI impossible.";
}

function ManualAviGeneratorPanel() {
  const [form, setForm] = useState<ManualAviFormState>(() => defaultManualAviForm());
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualAviError, setManualAviError] = useState<string | null>(null);
  const [manualAviNotice, setManualAviNotice] = useState<string | null>(null);
  const [manualAviResult, setManualAviResult] =
    useState<ManualAviGenerationResult | null>(null);

  function updateField(field: keyof ManualAviFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function generateManualAvi(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setManualAviError(null);
    setManualAviNotice(null);
    setManualAviResult(null);

    try {
      const response = await fetch("/api/admin/avi/generate", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: apiHeaders(),
        body: JSON.stringify(compactManualAviPayload(form)),
      });

      if (!response.ok) {
        throw new Error(await readManualAviError(response));
      }

      const result = (await response.json()) as ManualAviGenerationResult;
      setManualAviResult(result);
      setManualAviNotice(
        `AVI ${result.reference} generee, stockee et prete a verifier.`,
      );
    } catch (error) {
      setManualAviError(
        error instanceof Error ? error.message : "Generation AVI impossible.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm" aria-labelledby="manual-avi-title">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Admin only - generation manuelle
          </p>
          <h3 id="manual-avi-title" className="mt-1 text-lg font-semibold">
            Generateur AVI manuel
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Genere le PDF officiel depuis les templates AVI CERTIFY,
            l'enregistre dans Firebase Storage et cree les metadonnees de verification.
            Aucun email et aucun declenchement Stripe.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Verifier avant usage officiel
        </span>
      </div>

      {manualAviError ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {manualAviError}
        </div>
      ) : null}
      {manualAviNotice ? (
        <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
          {manualAviNotice}
        </div>
      ) : null}
      {manualAviResult ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 md:grid-cols-2">
          <div>
            <span className="block text-xs font-semibold uppercase text-emerald-700">Reference AVI</span>
            <span className="font-mono text-xs">{manualAviResult.aviNumberDisplay}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-emerald-700">Code verification</span>
            <span className="font-mono text-xs">{manualAviResult.verificationCode}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-emerald-700">Storage PDF</span>
            <span className="font-mono text-xs">{manualAviResult.storagePath}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase text-emerald-700">Template</span>
            <span className="font-mono text-xs">{manualAviResult.templateName}</span>
          </div>
          <div className="md:col-span-2">
            <span className="block text-xs font-semibold uppercase text-emerald-700">Verification publique</span>
            <a className="font-mono text-xs underline" href={manualAviResult.verificationUrl} target="_blank" rel="noreferrer">
              {manualAviResult.verificationUrl}
            </a>
          </div>
          <div className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => window.open(manualAviResult.downloadUrl, "_blank", "noopener,noreferrer")}>
              Telecharger le PDF officiel
            </Button>
          </div>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={generateManualAvi}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nom complet client *
            <Input value={form.studentFullName} onChange={(event) => updateField("studentFullName", event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Montant AVI *
            <Input type="number" min="1" step="0.01" value={form.aviAmount} onChange={(event) => updateField("aviAmount", event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Devise
            <Input value={form.currency} maxLength={3} onChange={(event) => updateField("currency", event.target.value.toUpperCase())} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Annee academique *
            <Input value={form.academicYear} onChange={(event) => updateField("academicYear", event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Destination
            <Input value={form.destinationCountry} onChange={(event) => updateField("destinationCountry", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Date d'emission
            <Input type="date" value={form.issueDate} onChange={(event) => updateField("issueDate", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Reference AVI
            <Input placeholder="AVI-2026-MANUAL-ABC123" value={form.aviReference} onChange={(event) => updateField("aviReference", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email client
            <Input type="email" value={form.studentEmail} onChange={(event) => updateField("studentEmail", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Ecole
            <Input value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Date de naissance
            <Input type="date" value={form.studentDateOfBirth} onChange={(event) => updateField("studentDateOfBirth", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Lieu de naissance
            <Input value={form.studentPlaceOfBirth} onChange={(event) => updateField("studentPlaceOfBirth", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Pays d'origine
            <Input value={form.originCountry} onChange={(event) => updateField("originCountry", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Valide jusqu'au
            <Input type="date" value={form.validUntil} onChange={(event) => updateField("validUntil", event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Reference dossier interne
            <Input value={form.internalCaseReference} onChange={(event) => updateField("internalCaseReference", event.target.value)} />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Notes admin internes
          <Textarea
            value={form.notesForAdmin}
            onChange={(event) => updateField("notesForAdmin", event.target.value)}
            placeholder="Note interne non imprimee sur le PDF"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isGenerating}>
            {isGenerating ? "Generation..." : "Generer l'AVI"}
          </Button>
          <p className="text-xs text-slate-500">
            Pas de Storage path accepte depuis le client, pas d'HTML brut, pas de creation client_cases.
          </p>
        </div>
      </form>
    </section>
  );
}

function DocumentsPanel({
  documents,
  clientByUid,
  onVerify,
  onOpenClient,
}: {
  documents: ClientDocument[];
  clientByUid: Map<string, AdminClientProfile>;
  onVerify: (documentId: string, status: "APPROVED" | "REJECTED") => void;
  onOpenClient: (uid: string) => void;
}) {
  return (
    <section className="space-y-4" aria-labelledby="documents-title">
      <h2 id="documents-title" className="text-xl font-semibold">Documents</h2>
      {documents.length ? (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Client", "Email", "Type", "Fichier", "Upload", "Vérification", "Accès", "Actions"].map((header) => (
                  <th key={header} className="px-4 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const client = clientByUid.get(document.uid);
                const resolution = document.ownerResolution;
                const resolvedName =
                  client ? displayClientName(client) : resolution?.fullName;
                const resolvedEmail = client?.email ?? resolution?.email ?? null;
                const canOpenClient360 = Boolean(
                  client || resolution?.canOpenClient360,
                );
                const resolutionStatus =
                  resolution?.status === "PROFILE_SYNC_REQUIRED"
                    ? "Profil admin à synchroniser"
                    : resolution?.status === "LEAD_NOT_CONVERTED"
                      ? "Lead non converti en dossier"
                      : resolution?.status === "UNRESOLVED"
                        ? "Identité non résolue"
                        : null;
                const hasFile =
                  Boolean(document.storagePath) &&
                  ["UPLOADED", "UNDER_REVIEW", "APPROVED"].includes(document.verificationStatus);
                return (
                  <tr key={document.id} className="border-t">
                    <td className="px-4 py-3">
                      <span className="font-semibold">{resolvedName ?? resolvedEmail ?? "Client à identifier"}</span>
                      {resolutionStatus ? (
                        <span className="mt-1 block text-xs font-medium text-amber-700">
                          {resolutionStatus}
                        </span>
                      ) : null}
                      <span className="block text-xs text-slate-500">UID {document.uid}</span>
                      {resolution ? (
                        <span className="block text-[11px] text-slate-400">
                          Source : {resolution.source}
                          {resolution.leadId ? ` · Lead ${resolution.leadId}` : ""}
                        </span>
                      ) : null}
                      {resolution?.warning ? (
                        <span className="mt-1 block text-xs font-medium text-red-700" role="alert">
                          {resolution.warning}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{resolvedEmail ?? "-"}</td>
                    <td className="px-4 py-3">{document.documentType}</td>
                    <td className="px-4 py-3">{document.fileName}</td>
                    <td className="px-4 py-3">{formatDate(document.uploadedAt)}</td>
                    <td className="px-4 py-3">{statusLabel(document.verificationStatus)}</td>
                    <td className="px-4 py-3">
                      <div className="grid gap-1">
                        <Button type="button" size="sm" variant="ghost" disabled={!hasFile} title={hasFile ? "Ouvrir via route admin sécurisée" : "Aucun fichier téléversé"} onClick={() => window.open(`/api/admin/documents/${document.id}/preview`, "_blank", "noopener,noreferrer")}>Voir</Button>
                        <Button type="button" size="sm" variant="ghost" disabled={!hasFile} title={hasFile ? "Télécharger via route admin sécurisée" : "Aucun fichier téléversé"} onClick={() => window.open(`/api/admin/documents/${document.id}/download`, "_blank", "noopener,noreferrer")}>Télécharger</Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canOpenClient360 ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => onOpenClient(document.uid)}>Ouvrir 360</Button>
                        ) : null}
                        <Button type="button" size="sm" variant="outline" onClick={() => onVerify(document.id, "APPROVED")}>Approuver</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => onVerify(document.id, "REJECTED")}>Rejeter</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Aucun document soumis" text="Les documents téléversés par les étudiants apparaîtront ici sans passer par Firebase Console." />
      )}
    </section>
  );
}

function ClientActionModal({
  action,
  clientCase,
  client,
  message,
  setMessage,
  title,
  setTitle,
  documentType,
  setDocumentType,
  isBusy,
  onClose,
  onSubmit,
}: {
  action: ClientAction | null;
  clientCase: ClientCase | null;
  client: AdminClientProfile | null;
  message: string;
  setMessage: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  documentType: (typeof documentTypeValues)[number];
  setDocumentType: (value: (typeof documentTypeValues)[number]) => void;
  isBusy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!action || !clientCase) return null;

  const titleByAction: Record<ClientAction, string> = {
    "request-document": "Demander un document",
    "add-note": "Ajouter une note interne",
    "send-notification": "Envoyer une notification",
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <section className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="client-action-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="client-action-title" className="text-xl font-semibold">{titleByAction[action]}</h2>
            <p className="mt-1 text-sm text-slate-600">Dossier {clientCase.caseNumber}</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
        <div className="mt-5 grid gap-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold">Client: {client ? displayClientName(client) : "Client à identifier"} - {client?.email ?? "email non renseigné"}</p>
            <p className="mt-1 text-slate-600">Dossier: {clientCase.caseNumber}</p>
            <p className="mt-1 text-slate-600">Statut: {statusLabel(clientCase.status)}</p>
            <p className="mt-1 text-slate-600">Effet: action journalisée, timeline rafraîchie et dossier mis à jour si applicable.</p>
          </div>
          {action === "send-notification" ? (
            <>
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Notification interne uniquement. Les canaux email et WhatsApp seront activés dans un lot ultérieur.
              </p>
              <label className="grid gap-1 text-sm font-medium">
                Titre
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Notification dossier" />
              </label>
            </>
          ) : null}
          {action === "request-document" ? (
            <>
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                La demande sera ajoutée au dossier, journalisée et envoyée par email si Resend est configuré.
              </p>
              <label className="grid gap-1 text-sm font-medium">
                Document requis
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(
                      event.target.value as (typeof documentTypeValues)[number],
                    )
                  }
                >
                  {documentTypeValues.map((value) => (
                    <option key={value} value={value}>
                      {documentTypeLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="grid gap-1 text-sm font-medium">
            Message / note
            <textarea
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2"
              value={message}
              maxLength={2_000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                action === "request-document"
                  ? "Préciser les éléments attendus au client"
                  : "Ajouter un contexte opérationnel"
              }
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="button" disabled={isBusy} onClick={onSubmit}>Confirmer</Button>
        </div>
      </section>
    </div>
  );
}

function NotificationsPanel({ notifications }: { notifications: AdminNotification[] }) {
  return (
    <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="notifications-title">
      <div className="border-b p-5"><h2 id="notifications-title" className="text-lg font-semibold">Notifications admin</h2></div>
      {notifications.length ? (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex gap-3 p-4">
              <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-semibold">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(notification.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5"><EmptyState title="Aucune activité récente" text="Les notifications opérations apparaîtront ici." /></div>
      )}
    </section>
  );
}

function AuditPanel({ events }: { events: AdminCaseEvent[] }) {
  return (
    <section className="rounded-lg border bg-white shadow-sm" aria-labelledby="audit-title">
      <div className="border-b p-5"><h2 id="audit-title" className="text-lg font-semibold">Audit opérations</h2></div>
      {events.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{["Date", "Acteur", "Événement", "Dossier", "Payload"].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t align-top">
                  <td className="px-4 py-3">{formatDate(event.createdAt)}</td>
                  <td className="px-4 py-3">{event.actorId ?? event.actorType}</td>
                  <td className="px-4 py-3">{event.eventLabel}</td>
                  <td className="px-4 py-3">{event.caseId ?? "-"}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-xs">{JSON.stringify(event.eventPayload)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5"><EmptyState title="Aucune activité récente" text="Les événements de dossier et d'administration seront journalisés ici." /></div>
      )}
    </section>
  );
}

function SettingsPanel({
  adminRole,
  isBusy,
  onSync,
  onReconcile,
}: {
  adminRole: AdminRole;
  isBusy: boolean;
  onSync: () => void;
  onReconcile: () => void;
}) {
  return (
    <section className="space-y-6" aria-labelledby="settings-title">
      <div>
        <h2 id="settings-title" className="text-xl font-semibold">Paramètres admin</h2>
        <p className="mt-1 text-sm text-slate-600">Outils de synchronisation et réconciliation réservés au super admin.</p>
      </div>
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold">Synchroniser et réconcilier</h3>
            <p className="mt-1 text-sm text-slate-600">Importe Firebase Auth puis stabilise les dossiers opérationnels sans créer de doublons.</p>
          </div>
          {adminRole === "super_admin" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isBusy} onClick={onSync}><RefreshCw className="h-4 w-4" aria-hidden="true" />Synchroniser utilisateurs Firebase</Button>
              <Button type="button" variant="outline" disabled={isBusy} onClick={onReconcile}><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />Réconcilier dossiers</Button>
            </div>
          ) : (
            <span className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600">Réservé super_admin</span>
          )}
        </div>
      </div>
    </section>
  );
}

function OperationsPlaceholder({ title, text, empty }: { title: string; text: string; empty: string }) {
  return (
    <section className="space-y-4" aria-labelledby={`${title}-title`}>
      <div>
        <h2 id={`${title}-title`} className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
      <EmptyState title={empty} text="Aucune valeur fictive n'est affichée dans l'interface de production." />
    </section>
  );
}
