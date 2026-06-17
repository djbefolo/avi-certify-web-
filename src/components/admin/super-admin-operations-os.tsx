"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
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

type Props = {
  adminRole: AdminRole;
  adminEmail?: string | null;
};

type OperationsData = {
  overview: AdminOperationsOverview | null;
  clients: AdminClientProfile[];
  cases: ClientCase[];
  documents: ClientDocument[];
  notifications: AdminNotification[];
  events: AdminCaseEvent[];
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
    | "housing_address_unavailable";
  message?: string;
  missingProfileFields?: string[];
  missingFieldLabels?: string[];
};

type ClientAction =
  | "request-document"
  | "add-note"
  | "send-notification";

const tabs = [
  ["Vue d'ensemble", "overview", Landmark],
  ["Clients", "clients", UsersRound],
  ["Dossiers", "cases", BriefcaseBusiness],
  ["Documents", "documents", FileArchive],
  ["Paiements", "payments", CreditCard],
  ["Finance / Préfinancement", "finance", ClipboardCheck],
  ["Attestations / AVI", "certificates", FileText],
  ["Notifications", "notifications", Bell],
  ["Audit", "audit", ShieldCheck],
  ["Paramètres admin", "settings", Settings],
] as const;

type TabKey = (typeof tabs)[number][1];
type FinanceSection = "simulateur" | "simulations" | "devis" | "rapports";

function apiHeaders() {
  return { "content-type": "application/json" };
}

async function readApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    credentials: "same-origin",
    headers: apiHeaders(),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText || "Admin API error"}`);
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
  if (!response.ok) throw new Error(`${response.status} ${response.statusText || "Admin API error"}`);
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
  const [data, setData] = useState<OperationsData>({
    overview: null,
    clients: [],
    cases: [],
    documents: [],
    notifications: [],
    events: [],
  });
  const [action, setAction] = useState<ClientAction | null>(null);
  const [actionCase, setActionCase] = useState<ClientCase | null>(null);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] =
    useState<(typeof documentTypeValues)[number]>("passport");
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
      const [clients, casesResponse, documents, notifications, audit] =
        await Promise.all([
          readApi<{ clients: AdminClientProfile[]; overview: AdminOperationsOverview }>("/api/admin/clients"),
          readApi<{ cases: ClientCase[] }>("/api/admin/cases"),
          readApi<{ documents: ClientDocument[] }>("/api/admin/documents"),
          readApi<{ notifications: AdminNotification[] }>("/api/admin/notifications"),
          readApi<{ events: AdminCaseEvent[] }>("/api/admin/audit"),
        ]);
      setData({
        overview: clients.overview,
        clients: clients.clients,
        cases: casesResponse.cases,
        documents: documents.documents,
        notifications: notifications.notifications,
        events: audit.events,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le cockpit opérations.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadClient(uid: string) {
    setSelectedUid(uid);
    setSelectedClient(null);
    setError(null);
    try {
      const response = await readApi<{ client: AdminClient360 }>(`/api/admin/clients/${encodeURIComponent(uid)}`);
      setSelectedClient(response.client);
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "Impossible de charger la fiche client.");
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
      setError("Créez d'abord un dossier opérationnel pour ce client.");
      return;
    }
    setAction(nextAction);
    setActionCase(clientCase);
    setMessage("");
    setTitle("");
    setDocumentType("passport");
  }

  async function refreshAfterAction(success: string) {
    setAction(null);
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
      setError("Créez d'abord un dossier opérationnel pour ce client.");
      return;
    }
    setIsBusy(true);
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
      setError("CrÃ©ez d'abord un dossier opÃ©rationnel pour ce client.");
      return;
    }
    setIsBusy(true);
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
      await refreshAfterAction("Attestation gÃ©nÃ©rÃ©e.");
    } catch (certificateError) {
      setError(
        certificateError instanceof Error
          ? certificateError.message
          : "GÃ©nÃ©ration attestation impossible.",
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
      setError("Créez d'abord un dossier opérationnel pour ce client.");
      return;
    }

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
                  onCreateCase={reconcileCases}
                  onMarkUnderReview={markUnderReview}
                  onGenerateCertificate={generateCertificate}
                  onOpenAction={openAction}
                  onOpenFinance={openFinance}
                  onClose={() => {
                    setSelectedUid(null);
                    setSelectedClient(null);
                  }}
                />
              </section>
            ) : null}

            {!isLoading && active === "cases" ? <CasesPanel cases={data.cases} clientByUid={clientByUid} /> : null}
            {!isLoading && active === "documents" ? <DocumentsPanel documents={data.documents} clientByUid={clientByUid} onVerify={verifyDocument} /> : null}
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
                <td className="px-4 py-3">{currentCase?.nextAction ?? "Qualifier la demande client"}</td>
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
  onCreateCase,
  onMarkUnderReview,
  onGenerateCertificate,
  onOpenAction,
  onOpenFinance,
  onClose,
}: {
  selectedUid: string | null;
  client: AdminClient360 | null;
  cases: ClientCase[];
  documents: ClientDocument[];
  financialFiles: ClientFinancialFile[];
  events: AdminCaseEvent[];
  communications: CommunicationLog[];
  onCreateCase: () => void;
  onMarkUnderReview: (clientCase: ClientCase | null) => void;
  onGenerateCertificate: (clientCase: ClientCase | null) => void;
  onOpenAction: (action: ClientAction, clientCase: ClientCase | null) => void;
  onOpenFinance: (
    clientUid: string,
    section: FinanceSection,
    clientCase: ClientCase | null,
  ) => void;
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
  const currentCase = cases[0] ?? null;
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
        <StatusBadge label="Action suivante" value={currentCase?.nextAction ?? "Qualifier la demande client"} />
        <StatusBadge label="Documents" value={statusLabel(currentCase?.documentStatus)} />
        <StatusBadge label="Paiement" value={statusLabel(currentCase?.paymentStatus)} />
        <StatusBadge label="Finance" value={statusLabel(currentCase?.financeStatus)} />
      </div>

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
        <DocumentsSummary documents={documents} />
        <PaymentsSummary caseItem={currentCase} />
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
            <div><dt className="font-semibold">UID</dt><dd className="font-mono text-xs">{client.profile.uid}</dd></div>
            <div><dt className="font-semibold">Case ID</dt><dd className="font-mono text-xs">{currentCase?.id ?? "-"}</dd></div>
          </dl>
        </details>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAction("request-document", currentCase)}>Demander document</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onMarkUnderReview(currentCase)}>Marquer en revue</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAction("add-note", currentCase)}>Ajouter note</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onGenerateCertificate(currentCase)}>GÃ©nÃ©rer attestation</Button>
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

function DocumentsSummary({ documents }: { documents: ClientDocument[] }) {
  const rows = documents.map((item) => `${item.documentType} · ${item.fileName} · ${statusLabel(item.verificationStatus)}`);
  return <SectionList title="Documents" empty="Aucun document soumis" rows={rows} />;
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

function DocumentsPanel({
  documents,
  clientByUid,
  onVerify,
}: {
  documents: ClientDocument[];
  clientByUid: Map<string, AdminClientProfile>;
  onVerify: (documentId: string, status: "APPROVED" | "REJECTED") => void;
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
                const hasFile =
                  Boolean(document.storagePath) &&
                  ["UPLOADED", "UNDER_REVIEW", "APPROVED", "PENDING"].includes(document.verificationStatus);
                return (
                  <tr key={document.id} className="border-t">
                    <td className="px-4 py-3">
                      <span className="font-semibold">{client ? displayClientName(client) : "Client à identifier"}</span>
                      <span className="block text-xs text-slate-500">UID {document.uid}</span>
                    </td>
                    <td className="px-4 py-3">{client?.email ?? "-"}</td>
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
                      <div className="flex gap-2">
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
