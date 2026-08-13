"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
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
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  StickyNote,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FintechCommandCenter } from "@/components/admin/fintech-command-center";
import { prospectDocumentStatusLabel } from "@/components/admin/prospect-360-labels";
import {
  AdminPageHeader,
  AdminSidebar,
  AdminTopbar,
  type AdminNavigationKey,
} from "@/components/admin/admin-experience-v2";
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
  AdminProspect360,
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
import type { HistoricalReconciliationPlan } from "@/types/historical-reconciliation";

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

type TabKey = AdminNavigationKey;
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

function nextActionSourceLabel(source: AdminLead["nextActionSource"]) {
  if (source === "SYSTEM_PROFILE_REMINDER") {
    return "Système - profil incomplet après relance";
  }

  if (source === "HUMAN_ADMIN") {
    return "Action humaine";
  }

  return "Non renseignée";
}

function leadSourceLabel(source: AdminLead["source"]) {
  const labels: Record<AdminLead["source"], string> = {
    PUBLIC_CONTACT_FORM: "Formulaire public",
    GUIDE_DOWNLOAD: "Téléchargement guide",
    PRICING: "Page tarifs",
    SIGNUP: "Création de compte",
    PROFILE: "Profil AVI CERTIFY",
    UNKNOWN: "Source non précisée",
  };
  return labels[source];
}

function humanizeTechnicalValue(value: string | null | undefined) {
  if (!value) return "-";
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return value;

  const normalized = value.replace(/[_-]+/g, " ").toLocaleLowerCase("fr-FR");
  return normalized.charAt(0).toLocaleUpperCase("fr-FR") + normalized.slice(1);
}

function prospectServiceLabel(service: string | null | undefined) {
  const labels: Record<string, string> = {
    avi: "Attestation de virement irrévocable",
    hebergement: "Attestation d’hébergement",
    accommodation_certificate: "Attestation d’hébergement",
    prefinancement: "Préfinancement étudiant",
    "accompagnement-visa": "Accompagnement visa",
    guide_france_2026: "Guide France 2026",
    autre: "Service à préciser",
  };

  return service ? labels[service] ?? humanizeTechnicalValue(service) : "Service non précisé";
}

function guideStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    READY: "Guide disponible",
    PENDING: "Préparation en cours",
    SENT: "Email envoyé",
    DELIVERED: "Guide livré",
    SEND_FAILED: "Échec d’envoi",
    RECIPIENT_MISSING: "Destinataire manquant",
    NOT_SENT: "Email non envoyé",
  };

  return status ? labels[status] ?? humanizeTechnicalValue(status) : "Non tracé";
}

function followUpReasonLabel(reason: string | null | undefined) {
  if (!reason) return "-";
  if (reason === "PROFILE_INCOMPLETE_AFTER_REMINDER") {
    return "Profil incomplet après relance";
  }

  return humanizeTechnicalValue(reason);
}

function qualificationMissingFieldLabel(field: string) {
  const labels: Record<string, string> = {
    phone: "téléphone",
    destinationCountry: "destination",
    requestedService: "service recherché",
    projectHorizon: "horizon du projet",
  };

  return labels[field] ?? humanizeTechnicalValue(field);
}

function communicationStatusLabel(status: string | null) {
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
  return status ? labels[status] ?? humanizeTechnicalValue(status) : "Non tracée";
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    passport: "Passeport",
    admission_letter: "Lettre d’admission",
    proof_of_address: "Justificatif de domicile",
    accommodation_certificate: "Attestation d’hébergement",
  };
  return labels[type] ?? documentTypeLabels[type as keyof typeof documentTypeLabels] ?? "Autre document";
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500"><FileArchive className="h-5 w-5" aria-hidden="true" /></span>
      <p className="mt-4 font-semibold text-slate-950">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function MetricCard({ label, value, detail, tone = "blue" }: { label: string; value: string | number; detail: string; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50/55 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/60 text-amber-800",
    red: "border-red-100 bg-red-50/60 text-red-700",
    slate: "border-slate-200 bg-white text-slate-700",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-600">{detail}</p>
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
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
  const [reconciliationPlan, setReconciliationPlan] =
    useState<HistoricalReconciliationPlan | null>(null);
  const [isReconciliationLoading, setIsReconciliationLoading] = useState(false);

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
      return response.lead;
    } catch (leadError) {
      setError(
        leadError instanceof Error
          ? leadError.message
          : "Mise à jour CRM prospect impossible.",
      );
      throw leadError;
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

  async function loadHistoricalReconciliation() {
    setIsReconciliationLoading(true);
    setError(null);
    try {
      const response = await readApi<{ plan: HistoricalReconciliationPlan }>(
        "/api/admin/reconciliation?limit=25",
      );
      setReconciliationPlan(response.plan);
      setNotice("Analyse historique terminée en lecture seule.");
    } catch (reconciliationError) {
      setError(
        reconciliationError instanceof Error
          ? reconciliationError.message
          : "Analyse historique impossible.",
      );
    } finally {
      setIsReconciliationLoading(false);
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
    <main className="min-h-screen bg-[#f4f7f8] text-slate-950">
      <div className="flex min-h-screen">
        <AdminSidebar
          active={active}
          collapsed={isSidebarCollapsed}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onSelect={setActive}
          onToggleCollapsed={() => setIsSidebarCollapsed((value) => !value)}
        />
        <section className="min-w-0 flex-1">
          <AdminTopbar
            active={active}
            adminEmail={adminEmail}
            adminRole={adminRole}
            isBusy={isBusy}
            onLogout={logoutAdmin}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            onRefresh={load}
          />
          <header className="hidden" aria-hidden="true">
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

          <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
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
                onOpenClient={(uid) => {
                  setActive("clients");
                  void loadClient(uid);
                }}
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
            {!isLoading && active === "reconciliation" ? (
              <HistoricalReconciliationPanel
                adminRole={adminRole}
                plan={reconciliationPlan}
                isLoading={isReconciliationLoading}
                onRun={loadHistoricalReconciliation}
              />
            ) : null}
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
      <AdminPageHeader
        eyebrow="Business pulse"
        title="Vue d’ensemble"
        subtitle="Un cockpit clair pour repérer les priorités, suivre les opérations et garder le bon niveau de contrôle."
      />
      <div className="grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800"><AlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="font-semibold text-amber-950">Attention requise</p><p className="text-sm leading-6 text-amber-900">Les éléments en attente, bloqués ou non lus restent visibles en priorité dans les indicateurs et le suivi ci-dessous.</p></div>
      </div>
      <div className="sr-only">
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
  onOpenClient,
  onUpdateLead,
}: {
  leads: AdminLead[];
  stats: AdminLeadStats | null;
  isBusy: boolean;
  onOpenClient: (uid: string) => void;
  onUpdateLead: (leadId: string, input: AdminLeadUpdateInput) => Promise<AdminLead>;
}) {
  const [statusFilter, setStatusFilter] = useState<AdminLeadCrmStatus | "all">("all");
  const [identityFilter, setIdentityFilter] = useState<
    "all" | "linked" | "unlinked" | "needs-review"
  >("all");
  const [followUpFilter, setFollowUpFilter] = useState<
    "all" | "needs-review" | "profile-reminder" | "overdue"
  >("all");
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [prospect, setProspect] = useState<AdminProspect360 | null>(null);
  const [isProspectOpen, setIsProspectOpen] = useState(false);
  const [isProspectLoading, setIsProspectLoading] = useState(false);
  const [prospectError, setProspectError] = useState<string | null>(null);
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
        followUpFilter === "profile-reminder" &&
        !(
          lead.nextActionSource === "SYSTEM_PROFILE_REMINDER" &&
          lead.followUpReason === "PROFILE_INCOMPLETE_AFTER_REMINDER"
        )
      ) {
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

  const loadProspect = async (leadId: string) => {
    setIsProspectLoading(true);
    setProspectError(null);
    try {
      const response = await readApi<{ prospect: AdminProspect360 }>(
        `/api/admin/leads/${encodeURIComponent(leadId)}`,
      );
      setProspect(response.prospect);
    } catch (loadError) {
      setProspectError(
        loadError instanceof Error
          ? loadError.message
          : "Chargement du Prospect 360 impossible.",
      );
    } finally {
      setIsProspectLoading(false);
    }
  };

  const openProspect = (leadId: string) => {
    setSelectedLeadId(leadId);
    setProspect(null);
    setProspectError(null);
    setIsProspectOpen(true);
    void loadProspect(leadId);
  };

  return (
    <section className="space-y-6" aria-labelledby="leads-title">
      <AdminPageHeader
        eyebrow="Commercial"
        title="Prospects et opportunités commerciales"
        subtitle="Centralisez les demandes, qualifiez les prospects et pilotez les prochaines actions commerciales."
      />
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-end">
        <div className="sr-only">
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
            <option value="profile-reminder">Profil incomplet après relance</option>
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
        <div className="space-y-6">
          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                    className={`transition hover:bg-slate-50 ${lead.id === selectedLead?.id ? "bg-emerald-50/60" : ""}`}
                    key={lead.id}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{lead.fullName}</p>
                      <p className="text-slate-600">{lead.email}</p>
                      <p className="text-xs text-slate-500">{lead.phone ?? "Téléphone non renseigné"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{prospectServiceLabel(lead.serviceInterest)}</p>
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
                      <p>{leadSourceLabel(lead.source)}</p>
                      <p className="text-xs text-slate-500">
                        {lead.utmSource ?? "-"} / {lead.utmMedium ?? "-"} / {lead.utmCampaign ?? "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{guideStatusLabel(lead.guideDeliveryStatus)}</p>
                      <p className="text-xs text-slate-500">{guideStatusLabel(lead.guideEmailStatus)}</p>
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
                          {lead.followUpReason ===
                          "PROFILE_INCOMPLETE_AFTER_REMINDER"
                            ? "Suivi humain - profil incomplet"
                            : "Revue humaine"}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">
                        {nextActionSourceLabel(lead.nextActionSource)}
                      </p>
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
                        onClick={() => openProspect(lead.id)}
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

        </div>
      )}
      <Prospect360Drawer
        error={prospectError}
        isBusy={isBusy}
        isLoading={isProspectLoading}
        isOpen={isProspectOpen}
        onClose={() => setIsProspectOpen(false)}
        onOpenClient={(uid) => {
          setIsProspectOpen(false);
          onOpenClient(uid);
        }}
        onReload={loadProspect}
        onUpdateLead={onUpdateLead}
        prospect={prospect}
      />
    </section>
  );
}

function Prospect360Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Activity;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-slate-200 px-5 py-6 sm:px-7">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h4 className="font-semibold text-slate-950">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2.5 text-sm last:border-0 sm:grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-slate-900 sm:text-right">{value || "-"}</dd>
    </div>
  );
}

function Prospect360Drawer({
  error,
  isBusy,
  isLoading,
  isOpen,
  onClose,
  onOpenClient,
  onReload,
  onUpdateLead,
  prospect,
}: {
  error: string | null;
  isBusy: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenClient: (uid: string) => void;
  onReload: (leadId: string) => Promise<void>;
  onUpdateLead: (leadId: string, input: AdminLeadUpdateInput) => Promise<AdminLead>;
  prospect: AdminProspect360 | null;
}) {
  const lead = prospect?.lead ?? null;
  const [crmStatus, setCrmStatus] = useState<Exclude<AdminLeadCrmStatus, "converted">>("new");
  const [crmPriority, setCrmPriority] = useState<AdminLeadCrmPriority>("normal");
  const [crmOwner, setCrmOwner] = useState("");
  const [lostReason, setLostReason] = useState<AdminLeadLostReason | "">("");
  const [nextAction, setNextAction] = useState<AdminLeadNextAction>("NONE");
  const [nextActionDueAt, setNextActionDueAt] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [newNote, setNewNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const previousLeadId = useRef<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    const changedLead = previousLeadId.current !== lead.id;
    previousLeadId.current = lead.id;
    setCrmStatus(lead.crmStatus === "converted" ? "qualified" : lead.crmStatus);
    setCrmPriority(lead.crmPriority);
    setCrmOwner(lead.crmOwner ?? "");
    setLostReason(
      ["NO_RESPONSE", "NOT_INTERESTED", "NOT_ELIGIBLE", "DUPLICATE", "OUT_OF_SCOPE", "OTHER"].includes(lead.lostReason ?? "")
        ? (lead.lostReason as AdminLeadLostReason)
        : "",
    );
    setNextAction(lead.nextAction);
    setNextActionDueAt(toDateTimeLocal(lead.nextActionDueAt));
    setFollowUpReason(lead.followUpReason ?? "");
    if (changedLead) {
      setLocalError(null);
      setLocalNotice(null);
      setNewNote("");
    }
  }, [lead]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const phone = lead?.phone?.trim() ?? "";
  const telHref = phone ? `tel:${phone.replace(/[^+\d]/g, "")}` : null;
  const whatsappNumber = phone.replace(/\D/g, "");
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  const saveCrm = async (requestedStatus?: Exclude<AdminLeadCrmStatus, "converted">) => {
    if (!lead || lead.crmStatus === "converted") return;
    const effectiveStatus = requestedStatus ?? crmStatus;
    setLocalError(null);
    setLocalNotice(null);
    try {
      await onUpdateLead(lead.id, {
        crmStatus: effectiveStatus,
        crmPriority,
        crmOwner: crmOwner.trim() || null,
        lostReason: effectiveStatus === "lost" ? lostReason || null : null,
        nextAction: effectiveStatus === "lost" ? "NONE" : nextAction,
        nextActionDueAt:
          effectiveStatus === "lost" || nextAction === "NONE" || !nextActionDueAt
            ? null
            : new Date(nextActionDueAt).toISOString(),
        followUpReason: followUpReason.trim() || null,
      });
      await onReload(lead.id);
      setLocalNotice("Pilotage CRM mis à jour.");
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : "Mise à jour CRM impossible.");
    }
  };

  const appendNote = async () => {
    if (!lead || !newNote.trim()) return;
    setLocalError(null);
    setLocalNotice(null);
    try {
      await writeApi(`/api/admin/leads/${encodeURIComponent(lead.id)}/notes`, { note: newNote.trim() });
      setNewNote("");
      await onReload(lead.id);
      setLocalNotice("Note interne ajoutée à l’historique.");
    } catch (noteError) {
      setLocalError(noteError instanceof Error ? noteError.message : "Ajout de note impossible.");
    }
  };

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button aria-label="Fermer Prospect 360" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} type="button" />
      <aside
        aria-label="Prospect 360"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl sm:max-w-[860px]"
        role="dialog"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Prospect 360</p>
              <h3 className="mt-1 truncate text-xl font-semibold text-slate-950">{lead?.fullName ?? "Chargement…"}</h3>
              <p className="truncate text-sm text-slate-500">{lead?.email ?? "Vue opérationnelle CRM"}</p>
            </div>
            <Button aria-label="Fermer" onClick={onClose} size="icon" type="button" variant="ghost">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && !prospect ? <div className="space-y-4 p-7"><div className="h-24 animate-pulse rounded-xl bg-slate-100" /><div className="h-64 animate-pulse rounded-xl bg-slate-100" /></div> : null}
          {error ? <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {prospect && lead ? (
            <>
              <section className="px-5 py-6 sm:px-7">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lead.crmStatus === "converted" ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"}`}>{lead.crmStatus === "converted" ? "Client" : "Prospect"}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lead.crmStatus === "qualified" ? "bg-emerald-50 text-emerald-800" : lead.crmStatus === "lost" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>{crmStatusLabel(lead.crmStatus)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{profileReadinessLabel(lead.profileReadiness)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${lead.identityLinkStatus === "LINKED" ? "bg-emerald-50 text-emerald-800" : lead.identityLinkStatus === "CONFLICT" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>{identityLinkStatusLabel(lead.identityLinkStatus)}</span>
                  {lead.humanFollowUpRequired ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Intervention requise</span> : null}
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">Priorité {crmPriorityLabel(lead.crmPriority).toLowerCase()}</span>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <a aria-disabled={!telHref} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${telHref ? "border-slate-300 text-slate-800 hover:bg-slate-50" : "pointer-events-none border-slate-200 text-slate-300"}`} href={telHref ?? undefined}><Phone className="h-4 w-4" />Appeler</a>
                  <a aria-disabled={!whatsappHref} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${whatsappHref ? "border-emerald-300 text-emerald-800 hover:bg-emerald-50" : "pointer-events-none border-slate-200 text-slate-300"}`} href={whatsappHref ?? undefined} rel="noreferrer" target="_blank"><MessageCircle className="h-4 w-4" />WhatsApp</a>
                  <a className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={`mailto:${lead.email}`}><Mail className="h-4 w-4" />Email</a>
                </div>
                <p className="mt-3 text-xs text-slate-500">Ces raccourcis ouvrent votre outil de contact. Aucun message n’est envoyé automatiquement.</p>
              </section>

              {(lead.humanFollowUpRequired || lead.qualificationMissingFields.length > 0 || ["AMBIGUOUS", "CONFLICT"].includes(lead.identityLinkStatus)) ? (
                <div className="mx-5 mb-1 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:mx-7">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div><p className="font-semibold">Décision humaine requise</p><p className="mt-1 text-amber-800">{lead.qualificationMissingFields.length ? `Informations à compléter : ${lead.qualificationMissingFields.map(qualificationMissingFieldLabel).join(", ")}.` : lead.identityLinkStatus === "LINKED" ? "Le suivi automatique est terminé ; une reprise opérateur est attendue." : "Le rapprochement d’identité doit être vérifié avant toute décision."}</p></div>
                </div>
              ) : null}

              {localError ? <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 sm:mx-7" role="alert">{localError}</div> : null}
              {localNotice ? <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 sm:mx-7" role="status">{localNotice}</div> : null}

              <Prospect360Section icon={BriefcaseBusiness} title="Projet">
                <dl><DetailRow label="Service" value={prospectServiceLabel(lead.serviceInterest)} /><DetailRow label="Destination" value={lead.destinationCountry ?? "-"} /><DetailRow label="Pays de résidence" value={lead.residenceCountry ?? lead.country ?? "-"} /><DetailRow label="Horizon" value={humanizeTechnicalValue(lead.projectHorizon)} /><DetailRow label="Source" value={leadSourceLabel(lead.source)} /><DetailRow label="Entrée du lead" value={formatDate(lead.createdAt)} /><DetailRow label="Attribution UTM" value={`${lead.utmSource ?? "-"} / ${lead.utmMedium ?? "-"} / ${lead.utmCampaign ?? "-"}`} /></dl>
              </Prospect360Section>

              <Prospect360Section icon={UserRound} title="Contact et compte AVI">
                <dl><DetailRow label="Lead ID" value={<span className="break-all font-mono text-xs">{lead.id}</span>} /><DetailRow label="Email" value={<span className="break-all">{lead.email}</span>} /><DetailRow label="Téléphone" value={lead.phone ?? "Non renseigné"} /><DetailRow label="WhatsApp" value={whatsappNumber || "Non disponible"} /><DetailRow label="Compte AVI" value={prospect.account.status === "ACTIVE" ? "Actif" : prospect.account.status === "DISABLED" ? "Désactivé" : prospect.account.status === "NOT_LINKED" ? "Non lié" : "Inconnu"} /><DetailRow label="Email vérifié" value={prospect.onboarding.emailVerifiedAt ? "Oui" : lead.linkedAccountEmailVerified === false ? "Non" : "Non tracé"} /><DetailRow label="UID" value={<span className="break-all font-mono text-xs">{prospect.account.uidMasked ?? "Non lié"}</span>} /></dl>
              </Prospect360Section>

              <Prospect360Section icon={ClipboardCheck} title="Qualification">
                {lead.crmStatus === "converted" ? <div className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Ce prospect est déjà converti. Prospect 360 est en lecture seule pour son statut.</div> : null}
                <dl className="mb-5 rounded-lg bg-slate-50 px-3"><DetailRow label="Statut CRM" value={crmStatusLabel(lead.crmStatus)} /><DetailRow label="Qualification" value={qualificationReadinessLabel(lead.qualificationReadiness)} /><DetailRow label="Profil" value={profileReadinessLabel(lead.profileReadiness)} /><DetailRow label="Priorité" value={crmPriorityLabel(lead.crmPriority)} /><DetailRow label="Responsable" value={lead.crmOwner ?? "Non attribué"} /></dl>
                {lead.crmStatus !== "converted" ? <div className="mb-5 grid gap-2 sm:grid-cols-3"><Button disabled={isBusy || !canTransitionLeadCrmStatus(lead.crmStatus, "contacted")} onClick={() => void saveCrm("contacted")} type="button" variant="outline">Marquer contacté</Button><Button disabled={isBusy || !canTransitionLeadCrmStatus(lead.crmStatus, "qualified")} onClick={() => void saveCrm("qualified")} type="button" variant="outline">Qualifier</Button><Button disabled={isBusy || !canTransitionLeadCrmStatus(lead.crmStatus, "lost")} onClick={() => setCrmStatus("lost")} type="button" variant="outline">Marquer perdu</Button></div> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">Statut CRM<select aria-label="Statut CRM Prospect 360" className="h-10 rounded-md border border-slate-300 bg-white px-3" disabled={lead.crmStatus === "converted"} onChange={(event) => setCrmStatus(event.target.value as Exclude<AdminLeadCrmStatus, "converted">)} value={crmStatus}>{(["new", "contacted", "qualified", "lost"] as const).map((value) => <option disabled={!canTransitionLeadCrmStatus(lead.crmStatus, value)} key={value} value={value}>{crmStatusLabel(value)}</option>)}</select></label>
                  <label className="grid gap-2 text-sm font-medium">Priorité<select className="h-10 rounded-md border border-slate-300 bg-white px-3" onChange={(event) => setCrmPriority(event.target.value as AdminLeadCrmPriority)} value={crmPriority}><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option></select></label>
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">Responsable CRM<Input onChange={(event) => setCrmOwner(event.target.value)} placeholder="Administrateur responsable" value={crmOwner} /></label>
                  {crmStatus === "lost" ? <label className="grid gap-2 text-sm font-medium sm:col-span-2">Motif de perte<select className="h-10 rounded-md border border-slate-300 bg-white px-3" onChange={(event) => setLostReason(event.target.value as AdminLeadLostReason | "")} value={lostReason}><option value="">Sélectionner</option><option value="NO_RESPONSE">Aucune réponse</option><option value="NOT_INTERESTED">Non intéressé</option><option value="NOT_ELIGIBLE">Non éligible</option><option value="DUPLICATE">Doublon</option><option value="OUT_OF_SCOPE">Hors périmètre</option><option value="OTHER">Autre</option></select></label> : null}
                  {crmStatus === "lost" && lostReason === "OTHER" ? <label className="grid gap-2 text-sm font-medium sm:col-span-2">Précision<Input onChange={(event) => setFollowUpReason(event.target.value)} placeholder="Préciser le motif de perte" value={followUpReason} /></label> : null}
                </div>
              </Prospect360Section>

              {lead.crmStatus === "converted" ? (
                <Prospect360Section icon={CheckCircle2} title="Conversion commerciale">
                  <dl className="rounded-lg bg-emerald-50/60 px-3">
                    <DetailRow label="Statut" value="Converti en client" />
                    <DetailRow label="Motif" value={lead.conversionReason === "PAYMENT_CONFIRMED" ? "Paiement confirmé" : "Traçabilité indisponible"} />
                    <DetailRow label="Référence" value={lead.conversionReference ?? "Non tracée"} />
                    <DetailRow label="Converti le" value={formatDate(lead.convertedAt)} />
                  </dl>
                  {lead.clientId ? <Button className="mt-4" onClick={() => onOpenClient(lead.clientId!)} type="button" variant="outline">Ouvrir Client 360</Button> : null}
                </Prospect360Section>
              ) : null}

              <Prospect360Section icon={Settings} title="Suivi">
                <dl className="mb-5 rounded-lg bg-slate-50 px-3"><DetailRow label="Action actuelle" value={nextActionLabel(lead.nextAction)} /><DetailRow label="Source de l’action" value={nextActionSourceLabel(lead.nextActionSource)} /><DetailRow label="Échéance actuelle" value={formatDate(lead.nextActionDueAt)} /><DetailRow label="Motif" value={followUpReasonLabel(lead.followUpReason)} /><DetailRow label="Responsable" value={lead.crmOwner ?? "Non attribué"} /><DetailRow label="Intervention requise" value={lead.humanFollowUpRequired ? "Oui" : "Non"} /></dl>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium">Prochaine action<select className="h-10 rounded-md border border-slate-300 bg-white px-3" disabled={crmStatus === "lost"} onChange={(event) => setNextAction(event.target.value as AdminLeadNextAction)} value={crmStatus === "lost" ? "NONE" : nextAction}><option value="NONE">Aucune</option><option value="CALL_PROSPECT">Appeler</option><option value="WHATSAPP_PROSPECT">WhatsApp</option><option value="EMAIL_PROSPECT">Email</option><option value="REQUEST_INFORMATION">Demander des informations</option><option value="REVIEW_PROFILE">Revoir le profil</option><option value="REVIEW_AMBIGUOUS_LINK">Revoir le rapprochement</option><option value="FOLLOW_UP">Relancer</option></select></label>
                  <label className="grid gap-2 text-sm font-medium">Échéance<Input disabled={crmStatus === "lost" || nextAction === "NONE"} onChange={(event) => setNextActionDueAt(event.target.value)} type="datetime-local" value={nextActionDueAt} /></label>
                  <label className="grid gap-2 text-sm font-medium sm:col-span-2">Motif de suivi<Input onChange={(event) => setFollowUpReason(event.target.value)} placeholder="Contexte opérationnel" value={followUpReason} /></label>
                </div>
                <Button className="mt-5 w-full sm:w-auto" disabled={isBusy || lead.crmStatus === "converted" || (crmStatus === "lost" && !lostReason)} onClick={() => void saveCrm()} type="button" variant="cta">Sauvegarder le pilotage CRM</Button>
                <p className="mt-3 text-xs text-slate-500">Qualifier ne convertit pas le prospect et ne crée aucun dossier, paiement ou service.</p>
              </Prospect360Section>

              <Prospect360Section icon={ShieldCheck} title="Onboarding">
                <dl><DetailRow label="Compte créé" value={formatDate(prospect.onboarding.accountCreatedAt)} /><DetailRow label="Email vérifié" value={formatDate(prospect.onboarding.emailVerifiedAt)} /><DetailRow label="Bienvenue" value={communicationStatusLabel(prospect.onboarding.welcomeEmailStatus)} /><DetailRow label="Bienvenue envoyée" value={formatDate(prospect.onboarding.welcomeEmailAt)} /><DetailRow label="Relance profil" value={communicationStatusLabel(prospect.onboarding.profileReminderStatus)} /><DetailRow label="Relance prévue" value={formatDate(prospect.onboarding.profileReminderDueAt)} /><DetailRow label="Relance envoyée" value={formatDate(prospect.onboarding.profileReminderAt)} /><DetailRow label="Tentatives" value={prospect.onboarding.reminderAttemptCount ?? "-"} /><DetailRow label="Suivi humain" value={communicationStatusLabel(prospect.onboarding.humanFollowUpStatus ?? (lead.humanFollowUpRequired ? "ACTIVE" : null))} /><DetailRow label="Motif du suivi" value={followUpReasonLabel(lead.followUpReason)} /><DetailRow label="Suivi requis le" value={formatDate(prospect.onboarding.humanFollowUpCreatedAt)} /><DetailRow label="Suivi attendu" value={formatDate(prospect.onboarding.humanFollowUpDueAt)} /><DetailRow label="Suivi résolu" value={formatDate(prospect.onboarding.humanFollowUpResolvedAt)} /></dl>
              </Prospect360Section>

              <Prospect360Section icon={StickyNote} title="Notes internes">
                <div className="space-y-3">{prospect.notes.length ? prospect.notes.map((note) => <article className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" key={note.id}><p className="whitespace-pre-wrap text-slate-800">{note.note}</p><p className="mt-2 text-xs text-slate-500">{formatDate(note.createdAt)} · {note.createdBy ? "Administrateur" : "Source historique"}</p></article>) : <p className="text-sm text-slate-500">Aucune note interne.</p>}</div>
                <label className="mt-4 grid gap-2 text-sm font-medium">Ajouter une note append-only<Textarea maxLength={2000} onChange={(event) => setNewNote(event.target.value)} placeholder="Observation interne factuelle" value={newNote} /></label>
                <Button className="mt-3" disabled={isBusy || !newNote.trim()} onClick={appendNote} type="button" variant="outline">Ajouter la note</Button>
              </Prospect360Section>

              <Prospect360Section icon={FileArchive} title="Documents">
                {prospect.documents.length ? <div className="space-y-2">{prospect.documents.map((document) => <article className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3" key={document.id}><div className="min-w-0"><p className="truncate text-sm font-semibold">{document.fileName}</p><p className="text-xs text-slate-500">{documentLabel(document.documentType)} · {prospectDocumentStatusLabel(document.status)} · {formatDate(document.uploadedAt)}</p></div><Button asChild size="sm" variant="outline"><a href={document.previewUrl} rel="noreferrer" target="_blank"><Eye className="mr-1 h-4 w-4" />Voir</a></Button></article>)}</div> : <p className="text-sm text-slate-500">Aucun document rattaché de façon sûre.</p>}
              </Prospect360Section>

              <Prospect360Section icon={Activity} title="Historique unifié">
                {prospect.timeline.length ? <ol className="space-y-4">{prospect.timeline.map((item) => <li className="relative border-l border-slate-200 pl-4" key={item.id}><span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-600" /><p className="text-sm font-medium text-slate-900">{item.label}</p><p className="text-xs text-slate-500">{formatDate(item.occurredAt)}{item.actor ? ` · ${item.actor}` : ""}</p></li>)}</ol> : <p className="text-sm text-slate-500">Aucune activité disponible.</p>}
              </Prospect360Section>

              <Prospect360Section icon={Bell} title="Communications">
                {prospect.communications.length ? <div className="space-y-2">{prospect.communications.map((communication) => <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3 text-sm" key={communication.id}><div><p className="font-medium">{communication.label}</p><p className="text-xs text-slate-500">{communication.channel === "EMAIL" ? "Email" : communication.channel === "DOCUMENT_REQUEST" ? "Demande de document" : communication.channel === "ADMIN_NOTIFICATION" ? "Notification administrative" : "Système"} · {formatDate(communication.occurredAt)}</p></div><span className="rounded-full bg-white px-2 py-1 text-xs font-semibold ring-1 ring-slate-200">{communicationStatusLabel(communication.status)}</span></div>)}</div> : <p className="text-sm text-slate-500">Aucune communication transactionnelle liée.</p>}
              </Prospect360Section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
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
      <div id="cases-title"><AdminPageHeader eyebrow="Opérations" title="Dossiers" subtitle="Suivez les services en cours, leurs pièces, leurs paiements et la prochaine action utile." /></div>
      {cases.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                  <tr key={clientCase.id} className="border-t transition hover:bg-slate-50">
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                <tr key={item.id} className="border-t align-top transition hover:bg-slate-50">
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                  <tr key={certificate.id} className="border-t transition hover:bg-slate-50">
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
      <div id="documents-title"><AdminPageHeader eyebrow="Opérations" title="Documents" subtitle="Identifiez rapidement les pièces reçues, les contrôles à effectuer et les accès sécurisés disponibles." /></div>
      {documents.length ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                  <tr key={document.id} className="border-t transition hover:bg-slate-50">
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="notifications-title">
      <div className="border-b border-slate-100 p-5"><h2 id="notifications-title" className="text-lg font-semibold tracking-tight">Notifications admin</h2><p className="mt-1 text-sm text-slate-500">Alertes et signaux opérationnels récents.</p></div>
      {notifications.length ? (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex gap-3 p-4 transition hover:bg-slate-50">
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="audit-title">
      <div className="border-b p-5"><h2 id="audit-title" className="text-lg font-semibold">Audit opérations</h2></div>
      {events.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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

function HistoricalReconciliationPanel({
  adminRole,
  plan,
  isLoading,
  onRun,
}: {
  adminRole: AdminRole;
  plan: HistoricalReconciliationPlan | null;
  isLoading: boolean;
  onRun: () => void;
}) {
  const labels: Record<keyof HistoricalReconciliationPlan["counts"], string> = {
    ALREADY_CORRECT: "DéjÃ  cohérent",
    SAFE_AUTO_RECONCILABLE: "Correction sûre",
    MANUAL_REVIEW: "À examiner",
    AMBIGUOUS: "Ambigu",
    CONFLICT: "Conflit",
    INSUFFICIENT_DATA: "Données insuffisantes",
    UNSUPPORTED_LEGACY: "Héritage non pris en charge",
  };
  const tones: Record<keyof HistoricalReconciliationPlan["counts"], "green" | "amber" | "red" | "slate"> = {
    ALREADY_CORRECT: "green",
    SAFE_AUTO_RECONCILABLE: "green",
    MANUAL_REVIEW: "amber",
    AMBIGUOUS: "amber",
    CONFLICT: "red",
    INSUFFICIENT_DATA: "amber",
    UNSUPPORTED_LEGACY: "slate",
  };

  return (
    <section className="space-y-6" aria-labelledby="historical-reconciliation-title">
      <AdminPageHeader
        eyebrow="Contrôle des données"
        title="Réconciliation historique"
        subtitle="Analyse bornée et strictement en lecture seule. Aucune liaison, conversion CRM, notification ou création de client ne peut être déclenchée depuis cette page."
      />
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Dry-run uniquement</p>
        <p className="mt-1">Les corrections sûres restent de simples propositions. Le mode APPLY_SAFE_ONLY n’est pas exposé et n’est pas exécuté en production.</p>
      </div>
      {adminRole === "super_admin" ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 id="historical-reconciliation-title" className="font-semibold">Analyser jusqu’à 25 leads</h2><p className="mt-1 text-sm text-slate-600">Pagination bornée, sans aucune écriture dans Firestore.</p></div>
          <Button type="button" onClick={onRun} disabled={isLoading}>{isLoading ? "Analyse en cours…" : "Lancer le dry-run"}</Button>
        </div>
      ) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Réservé au super admin.</div>}
      {plan ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(plan.counts).map(([key, value]) => <MetricCard key={key} label={labels[key as keyof typeof labels]} value={value} detail="Dans ce lot" tone={tones[key as keyof typeof tones]} />)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5"><p className="font-semibold">Résultats du lot</p><p className="mt-1 text-sm text-slate-600">{plan.inspected} leads inspectés. Les identifiants sont conservés pour revue administrative, sans exposer les documents complets.</p></div>
            <div className="divide-y">
              {plan.items.map((result) => <div key={result.entityId} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-sm font-semibold text-slate-900">{result.entityId}</p><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">{labels[result.classification]}</span></div><p className="mt-2 text-sm text-slate-600">{result.blockingReasons[0] ?? result.evidence.map((evidence) => evidence.detail).join(" ")}</p>{result.proposedChanges.length ? <p className="mt-2 text-xs text-emerald-800">Proposition : {result.proposedChanges.map((change) => change.field).join(", ")}</p> : null}</div>)}
            </div>
          </div>
        </>
      ) : null}
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
