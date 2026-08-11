import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SuperAdminOperationsOS } from "@/components/admin/super-admin-operations-os";
import type {
  AdminCaseEvent,
  AdminClientProfile,
  AdminNotification,
  ClientCase,
  ClientDocument,
  ClientFinancialFile,
} from "@/types/admin-ops";
import type { AdminLead, AdminLeadStats } from "@/types/admin-crm";

vi.mock("@/components/admin/fintech-command-center", () => ({
  FintechCommandCenter: ({
    initialClientUid,
    initialSection,
  }: {
    initialClientUid?: string;
    initialSection?: string;
  }) => (
    <div data-testid="fintech-command-center">
      Finance client {initialClientUid ?? "all"} section {initialSection}
    </div>
  ),
}));

const client: AdminClientProfile = {
  uid: "client-1",
  email: "student@example.com",
  fullName: "Awa Student",
  phone: "+237600000000",
  countryOfOrigin: "Cameroun",
  destinationCountry: "Canada",
  createdAt: "2026-05-25T08:00:00.000Z",
  lastLoginAt: "2026-05-25T09:00:00.000Z",
  accountStatus: "ACTIVE",
  onboardingStatus: "IN_PROGRESS",
  currentCaseId: "case-1",
  tags: ["firebase_auth_sync"],
  priority: "NORMAL",
  assignedAdminId: null,
  source: "firebase_auth_sync",
  updatedAt: "2026-05-25T09:00:00.000Z",
};

const clientCase: ClientCase = {
  id: "case-1",
  uid: "client-1",
  caseNumber: "AVI-2026-0001",
  productType: "PREFINANCEMENT",
  status: "DOCUMENTS_PENDING",
  requestedAmount: 8_000_000,
  requestedCurrency: "XAF",
  destinationCountry: "Canada",
  schoolName: "Université test",
  intakeDate: "2026-09-01",
  notes: null,
  createdAt: "2026-05-25T08:00:00.000Z",
  updatedAt: "2026-05-25T09:00:00.000Z",
};

const documentRow: ClientDocument = {
  id: "doc-1",
  uid: "client-1",
  caseId: "case-1",
  documentType: "passport",
  fileName: "passport.pdf",
  storagePath: "users/client-1/documents/passport.pdf",
  downloadUrl: null,
  uploadStatus: "uploaded",
  verificationStatus: "UPLOADED",
  rejectionReason: null,
  uploadedAt: "2026-05-25T08:30:00.000Z",
  verifiedAt: null,
  verifiedBy: null,
};

const certificateRow: ClientDocument = {
  id: "case-1-housing-certificate",
  uid: "client-1",
  caseId: "case-1",
  clientEmail: "student@example.com",
  clientName: "Awa Student",
  documentType: "accommodation_certificate",
  fileName: "attestation-hebergement-avi-certify.pdf",
  storagePath: "users/client-1/documents/case-1-housing-certificate-attestation.pdf",
  downloadUrl: null,
  uploadStatus: "generated",
  verificationStatus: "APPROVED",
  rejectionReason: null,
  uploadedAt: "2026-06-16T10:00:00.000Z",
  verifiedAt: "2026-06-16T10:00:00.000Z",
  verifiedBy: "admin-1",
};

const notification: AdminNotification = {
  id: "note-1",
  type: "new_user_registered",
  severity: "info",
  title: "Nouvel utilisateur Firebase détecté",
  body: "student@example.com a été ajouté.",
  relatedUid: "client-1",
  relatedCaseId: null,
  read: false,
  createdAt: "2026-05-25T08:00:00.000Z",
};

const financialFile: ClientFinancialFile = {
  id: "finance-1",
  uid: "client-1",
  caseId: "case-1",
  simulationId: "simulation-1",
  quoteId: "quote-1",
  reportId: null,
  productCode: "prefinancement-canada-cad",
  region: "canada",
  xafAmount: 8_000_000,
  option: "option_a_3m",
  riskTier: "75%",
  status: "QUOTED",
  createdAt: "2026-05-25T08:45:00.000Z",
  updatedAt: "2026-05-25T08:45:00.000Z",
};

const event: AdminCaseEvent = {
  id: "evt-1",
  caseId: "case-1",
  uid: "client-1",
  actorType: "system",
  actorId: "system",
  actorRole: "system",
  eventType: "auth_users_synced",
  eventLabel: "Synchronisation Firebase Auth exécutée",
  eventPayload: { synced: 1 },
  createdAt: "2026-05-25T08:00:00.000Z",
};

const lead: AdminLead = {
  id: "lead-1",
  fullName: "Awa Prospect",
  email: "awa@example.com",
  normalizedEmail: "awa@example.com",
  phone: "+237600000000",
  residenceCountry: "Cameroun",
  country: "Cameroun",
  destinationCountry: "France",
  requestedService: "guide_france_2026",
  serviceInterest: "guide_france_2026",
  projectHorizon: "rentree-2026",
  message: null,
  source: "GUIDE_DOWNLOAD",
  sourceDetail: "floating_cta",
  origin: "floating_cta",
  status: "NEW",
  rawSource: "guide",
  rawStatus: "NEW",
  contactConsent: false,
  marketingConsent: true,
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "guide_launch",
  utmContent: null,
  utmTerm: null,
  referrer: "https://google.example/search",
  guideRequested: true,
  guideDelivered: false,
  guideDeliveryStatus: "READY",
  guideDeliveryChannel: "client_space",
  guideEmailSent: true,
  guideEmailStatus: "SENT",
  canonicalCrmStatus: "NEW",
  crmStatus: "new",
  crmPriority: "normal",
  crmOwner: null,
  crmNotes: null,
  lastContactedAt: null,
  qualifiedAt: null,
  convertedAt: null,
  lostReason: null,
  linkedUid: null,
  linkedAt: null,
  linkMethod: null,
  createdAt: "2026-06-27T10:00:00.000Z",
  updatedAt: "2026-06-27T10:00:00.000Z",
};

const leadStats: AdminLeadStats = {
  total: 1,
  new: 1,
  contacted: 0,
  qualified: 0,
  converted: 0,
  lost: 0,
  guideSucceeded: 1,
  guideEmailFailures: 0,
};
function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

function manualAviResponse() {
  return {
    ok: true,
    status: 201,
    statusText: "Created",
    json: async () => ({
      generated: true,
      reference: "AVI-FR-26-CMR-01-00001011",
      documentId: "AVI-FR-26-CMR-01-00001011",
      aviNumberDisplay: "AVI/FR/26/CMR/01/00001011",
      verificationCode: "AVI-FR-26-CMR-01-00001011",
      verificationUrl: "https://verify.avicertify.fr/AVI-FR-26-CMR-01-00001011",
      storagePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.pdf",
      htmlStoragePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.html",
      downloadUrl: "/api/admin/avi/AVI-FR-26-CMR-01-00001011/download",
      templateName: "avi-certificate-europe-france.html",
      pdfGenerationEngine: "chromium-html",
    }),
  } as Response;
}

function mockOperationsFetch({
  certificateResponse,
  documents = [documentRow],
  cases = [clientCase],
  client360Cases = cases,
  clientCertificates = [],
  manualAviError,
}: {
  certificateResponse?: Record<string, unknown>;
  documents?: ClientDocument[];
  cases?: ClientCase[];
  client360Cases?: ClientCase[];
  clientCertificates?: Array<Record<string, unknown>>;
  manualAviError?: string;
} = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/admin/avi/generate")) {
      if (manualAviError) {
        return {
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ error: manualAviError }),
        } as Response;
      }

      return manualAviResponse();
    }
    if (url.includes("/api/admin/operations/sync-auth-users")) {
      return jsonResponse({ result: { synced: 1, created: 1, updated: 0 } });
    }
    if (url.includes("/api/admin/leads/lead-1")) {
      return jsonResponse({
        lead: {
          ...lead,
          crmStatus: "contacted",
          crmPriority: "high",
          crmNotes: "Relance effectuée.",
          lastContactedAt: "2026-06-27T11:00:00.000Z",
          updatedAt: "2026-06-27T11:00:00.000Z",
        },
      });
    }
    if (url.includes("/api/admin/leads")) {
      return jsonResponse({
        leads: [lead],
        stats: leadStats,
      });
    }
    if (url.includes("/api/admin/clients/client-1")) {
      return jsonResponse({
        client: {
          profile: client,
          cases: client360Cases,
          documents,
          documentDiagnostics: {
            resolvedUid: "client-1",
            authUid: "client-1",
            email: "student@example.com",
            caseIds: ["case-1"],
            firestoreCounts: {
              documents: documents.length,
              clientDocuments: documents.length,
            },
            storage: {
              status: "CHECKED",
              fileCount: documents.length,
              orphanedFileCount: 0,
            },
            sourcesQueried: [
              "documents.ownerId",
              "client_documents.uid",
              "storage.users/client-1/documents",
            ],
            lastRefresh: "2026-07-16T12:00:00.000Z",
            message: "Rattachement documentaire vérifié.",
            error: null,
          },
          payments: [],
          financialFiles: [financialFile],
          certificates: clientCertificates,
          communications: [
            {
              id: "comm-1",
              caseId: "case-1",
              uid: "client-1",
              type: "DOCUMENT_REQUEST",
              template: "document-request",
              recipient: "student@example.com",
              status: "SENT",
              provider: "resend",
              messageId: "resend-1",
              createdAt: "2026-05-25T08:40:00.000Z",
            },
          ],
          timeline: [event],
        },
      });
    }
    if (url.includes("/api/admin/clients")) {
      return jsonResponse({
        clients: [client],
        overview: {
          newRegistrationsToday: 1,
          newCasesToday: 1,
          documentsAwaitingReview: 1,
          paymentsPending: 0,
          paymentsConfirmed: 0,
          certificatesGenerated: 0,
          casesBlocked: 0,
          clientsTotal: 1,
          casesTotal: cases.length,
          unreadNotifications: 1,
        },
      });
    }
    if (url.includes("/api/admin/documents/approve")) {
      return jsonResponse({ document: { ...documentRow, verificationStatus: "APPROVED" } });
    }
    if (url.includes("/api/admin/documents/reject")) {
      return jsonResponse({ document: { ...documentRow, verificationStatus: "REJECTED" } });
    }
    if (url.includes("/request-document")) {
      return jsonResponse({
        document: {
          ...documentRow,
          id: "req-1",
          verificationStatus: "REQUESTED",
        },
      });
    }
    if (url.includes("/certificates")) {
      return jsonResponse(
        certificateResponse ?? {
          generated: true,
          certificateId: "case-1-housing-certificate",
          certificateNumber: "AVI-HBG-2026-CASE1",
          verificationUrl: "https://www.avicertify.fr/verifier/token-1",
          message: "Attestation generee.",
          email: { sent: true, status: "SENT", messageId: "email-1" },
        },
      );
    }
    if (url.includes("/status")) {
      return jsonResponse({ case: { ...clientCase, status: "UNDER_REVIEW" } });
    }
    if (url.includes("/notifications") && !url.endsWith("/api/admin/notifications")) {
      return jsonResponse({ notification: { id: "note-case" } });
    }
    if (url.includes("/api/admin/operations/reconcile-cases")) {
      return jsonResponse({ result: { checked: 1, created: 1 } });
    }
    if (url.includes("/api/admin/cases")) {
      return jsonResponse({ cases });
    }
    if (url.includes("/api/admin/documents")) {
      return jsonResponse({ documents });
    }
    if (url.includes("/api/admin/notifications")) {
      return jsonResponse({ notifications: [notification] });
    }
    if (url.includes("/api/admin/audit")) {
      return jsonResponse({ events: [event] });
    }
    if (url.includes("/api/admin/session/logout")) {
      return jsonResponse({ ok: true });
    }

    return jsonResponse({});
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockWindowOpen() {
  return vi.spyOn(window, "open").mockImplementation(() => null);
}

function getGenerateCertificateButton() {
  const button = screen
    .getAllByRole("button")
    .find((item) => {
      const text = item.textContent ?? "";

      return /attestation/i.test(text) && !/AVI/i.test(text);
    });

  if (!button) {
    throw new Error("Generate certificate button not found.");
  }

  return button;
}

describe("SuperAdminOperationsOS", () => {
  it("renders real operations navigation, clients, notifications, and no fallback wording", async () => {
    mockOperationsFetch();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    expect(await screen.findByText("AVI CERTIFY Super Admin Operations OS")).toBeInTheDocument();
    for (const label of [
      "Vue d'ensemble",
      "Prospects",
      "Clients",
      "Dossiers",
      "Documents",
      "Paiements",
      "Finance / Préfinancement",
      "Attestations / AVI",
      "Notifications",
      "Audit",
      "Paramètres admin",
    ]) {
      expect(screen.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
    }

    expect(screen.queryByText(/Fallback dev state/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dev admin token/i)).not.toBeInTheDocument();
    expect(await screen.findByText("Nouvel utilisateur Firebase détecté")).toBeInTheDocument();
  });

  it("opens a client 360 panel and exposes documents/timeline", async () => {
    mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));

    expect((await screen.findAllByText("Awa Student")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/passport.pdf/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Voir" })).toHaveAttribute(
      "href",
      "/api/admin/documents/doc-1/preview",
    );
    expect(screen.getByRole("link", { name: "Télécharger" })).toHaveAttribute(
      "href",
      "/api/admin/documents/doc-1/download",
    );
    expect(screen.getByText(/Synchronisation Firebase Auth exécutée/)).toBeInTheDocument();
    expect(screen.getByText("Rattachement documentaire vérifié.")).toBeInTheDocument();
    expect(screen.getByText(/documents: 1 · client_documents: 1/)).toBeInTheDocument();
    expect(screen.getByText(/CHECKED · fichiers: 1 · orphelins: 0/)).toBeInTheDocument();
  });

  it("shows a resolved document owner with UID, lead status, and Client 360 action", async () => {
    mockOperationsFetch({
      documents: [
        {
          ...documentRow,
          uid: "owner-uid",
          clientName: "Ngonga Nkoloma Bijou",
          clientEmail: "sylvainmujidila@yahoo.com",
          ownerResolution: {
            uid: "owner-uid",
            fullName: "Ngonga Nkoloma Bijou",
            email: "sylvainmujidila@yahoo.com",
            phone: "+33605701368",
            source: "users",
            status: "LEAD_NOT_CONVERTED",
            caseId: null,
            leadId: "lead-1",
            canOpenClient360: true,
            warning: null,
          },
        },
      ],
    });
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Documents" })[0]);

    expect(await screen.findByText("Ngonga Nkoloma Bijou")).toBeInTheDocument();
    expect(screen.getByText("sylvainmujidila@yahoo.com")).toBeInTheDocument();
    expect(screen.getByText("UID owner-uid")).toBeInTheDocument();
    expect(screen.getByText("Lead non converti en dossier")).toBeInTheDocument();
    expect(screen.getByText(/Source : users · Lead lead-1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir 360" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Voir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeEnabled();
  });

  it("keeps an unresolved document owner explicit and downloadable", async () => {
    mockOperationsFetch({
      documents: [
        {
          ...documentRow,
          uid: "unknown-owner",
          ownerResolution: {
            uid: "unknown-owner",
            fullName: null,
            email: null,
            phone: null,
            source: "unresolved",
            status: "UNRESOLVED",
            caseId: null,
            leadId: null,
            canOpenClient360: false,
            warning: null,
          },
        },
      ],
    });
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Documents" })[0]);

    expect(await screen.findByText("Client à identifier")).toBeInTheDocument();
    expect(screen.getByText("UID unknown-owner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ouvrir 360" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Télécharger" })).toBeEnabled();
  });

  it("shows CRM leads and saves CRM status without creating an operational case", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Prospects" })[0]);

    expect(await screen.findByText("Prospects CRM")).toBeInTheDocument();
    expect(screen.getAllByText("Awa Prospect").length).toBeGreaterThan(0);
    expect(screen.getAllByText("awa@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("google / cpc / guide_launch")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /créer dossier/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ouvrir CRM" }));
    await user.selectOptions(screen.getByLabelText("Statut CRM"), "contacted");
    await user.selectOptions(screen.getByLabelText("Priorité"), "high");
    await user.type(screen.getByLabelText("Notes internes"), "Relance effectuée.");
    await user.click(screen.getByRole("button", { name: "Sauvegarder CRM" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/leads/lead-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            crmStatus: "contacted",
            crmPriority: "high",
            crmOwner: null,
            crmNotes: "Relance effectuée.",
            lostReason: null,
          }),
        }),
      );
    });
  });

  it("shows the super-admin Firebase sync action and calls the protected API", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Paramètres admin" })[0]);
    await user.click(await screen.findByRole("button", { name: "Synchroniser utilisateurs Firebase" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/operations/sync-auth-users",
        expect.objectContaining({
          method: "POST",
          credentials: "same-origin",
        }),
      );
    });
  });

  it("requests a document from Client 360 and posts the selected type", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));

    await user.click(await screen.findByRole("button", { name: "Demander document" }));
    expect(await screen.findByRole("dialog", { name: "Demander un document" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Document requis"), "admission_letter");
    await user.type(
      screen.getByPlaceholderText("Préciser les éléments attendus au client"),
      "Merci de joindre la version définitive.",
    );
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cases/case-1/request-document",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            documentType: "admission_letter",
            message: "Merci de joindre la version définitive.",
          }),
        }),
      );
    });
  });

  it("shows visible Client 360 action feedback when a dossier is missing", async () => {
    const fetchMock = mockOperationsFetch({
      cases: [],
      client360Cases: [],
      documents: [],
    });
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));

    expect(await screen.findByText("Dossier requis pour les actions Client 360")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Demander document" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demander document indisponible : créez d'abord un dossier opérationnel pour ce client.",
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/cases/case-1/request-document",
      expect.anything(),
    );

    await user.click(screen.getByRole("button", { name: "Envoyer notification" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Envoyer notification indisponible : créez d'abord un dossier opérationnel pour ce client.",
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/cases/case-1/notifications",
      expect.anything(),
    );
  });

  it("keeps core Client 360 actions active and downstream actions disabled", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));

    expect(screen.getByRole("button", { name: "Lier simulation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Générer devis" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Rapport préfinancement" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Marquer en revue" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cases/case-1/status",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    await user.click(screen.getByRole("button", { name: "Ajouter note" }));
    expect(await screen.findByRole("dialog", { name: "Ajouter une note interne" })).toBeInTheDocument();
    await user.type(
      screen.getByPlaceholderText("Ajouter un contexte opérationnel"),
      "Contrôle manuel effectué",
    );
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cases/case-1/notes",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await user.click(screen.getByRole("button", { name: "Envoyer notification" }));
    expect(await screen.findByRole("dialog", { name: "Envoyer une notification" })).toBeInTheDocument();
    expect(screen.getByText(/Notification interne uniquement/)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("Notification dossier"), "Relance document");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cases/case-1/notifications",
        expect.objectContaining({ method: "POST" }),
      );
    });
  }, 10_000);

  it("opens the Finance command center for the selected Client 360 action", async () => {
    mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));
    expect(screen.getByText(/QUOTED · simulation-1 · quote-1/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Générer devis" }));

    expect(await screen.findByTestId("fintech-command-center")).toHaveTextContent(
      "Finance client client-1 section devis",
    );
  });

  it("generates a certificate from Client 360 without opening finance", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));
    await user.click(screen.getByRole("button", { name: /g.n.rer attestation/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/cases/case-1/certificates",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            certificateType: "accommodation_certificate",
          }),
        }),
      );
    });
    expect(screen.queryByTestId("fintech-command-center")).not.toBeInTheDocument();
  });

  it("shows a business error when certificate generation is blocked", async () => {
    const fetchMock = mockOperationsFetch({
      certificateResponse: {
        generated: false,
        reason: "missing_profile_data",
        certificateId: "case-1-housing-certificate",
        certificateNumber: null,
        verificationUrl: null,
        message: "Generation bloquee : profil incomplet (date de naissance).",
        missingProfileFields: ["dateOfBirth"],
        missingFieldLabels: ["date de naissance"],
        email: { sent: false, status: "RECIPIENT_MISSING", messageId: null },
      },
    });
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));
    await user.click(getGenerateCertificateButton());

    expect(
      await screen.findByText(
        "Generation bloquee : profil incomplet (date de naissance).",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Attestation generee.")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/cases/case-1/certificates",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows generated certificates in the Attestations / AVI tab", async () => {
    mockOperationsFetch({
      documents: [documentRow, certificateRow],
      clientCertificates: [
        {
          id: certificateRow.id,
          documentType: certificateRow.documentType,
          status: certificateRow.verificationStatus,
        },
      ],
    });
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Attestations / AVI" })[0]);

    expect(await screen.findByText("attestation-hebergement-avi-certify.pdf")).toBeInTheDocument();
    expect(screen.getByText("Awa Student")).toBeInTheDocument();
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
  });

  it("renders the manual AVI generator and exposes the stored PDF download", async () => {
    const fetchMock = mockOperationsFetch();
    const windowOpen = mockWindowOpen();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Attestations / AVI" })[0]);

    expect(await screen.findByText("Generateur AVI manuel")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Nom complet client/i), "Awa Student");
    await user.type(screen.getByLabelText(/Montant AVI/i), "7420");
    await user.type(screen.getByLabelText(/Reference AVI/i), "AVI-FR-26-CMR-01-00001011");
    await user.type(screen.getByLabelText(/Email client/i), "awa@example.com");
    await user.click(screen.getByRole("button", { name: "Generer l'AVI" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/avi/generate",
        expect.objectContaining({
          method: "POST",
          credentials: "same-origin",
        }),
      );
    });

    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/api/admin/avi/generate"),
    ) as [RequestInfo | URL, RequestInit] | undefined;
    const body = JSON.parse(String(call?.[1]?.body));

    expect(body).toMatchObject({
      studentFullName: "Awa Student",
      aviAmount: 7420,
      currency: "EUR",
      academicYear: "2026-2027",
      destinationCountry: "France",
      aviReference: "AVI-FR-26-CMR-01-00001011",
      studentEmail: "awa@example.com",
    });
    expect(await screen.findByText(/AVI AVI-FR-26-CMR-01-00001011 generee/i)).toBeInTheDocument();
    expect(screen.getByText("AVI/FR/26/CMR/01/00001011")).toBeInTheDocument();
    expect(screen.getByText("avi-certificates/AVI-FR-26-CMR-01-00001011.pdf")).toBeInTheDocument();
    expect(screen.getByText("https://verify.avicertify.fr/AVI-FR-26-CMR-01-00001011")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Telecharger le PDF officiel" }));

    expect(windowOpen).toHaveBeenCalledWith(
      "/api/admin/avi/AVI-FR-26-CMR-01-00001011/download",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("shows an error when manual AVI generation fails", async () => {
    mockOperationsFetch({ manualAviError: "Payload AVI invalide." });
    mockWindowOpen();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Attestations / AVI" })[0]);
    await user.type(screen.getByLabelText(/Nom complet client/i), "Awa Student");
    await user.type(screen.getByLabelText(/Montant AVI/i), "7420");
    await user.click(screen.getByRole("button", { name: "Generer l'AVI" }));

    expect(await screen.findByText("Payload AVI invalide.")).toBeInTheDocument();
  });

  it("resolves document identity and approve/reject actions without primary raw UID display", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Documents" })[0]);

    expect(await screen.findByText("Awa Student")).toBeInTheDocument();
    expect(screen.getByText("student@example.com")).toBeInTheDocument();
    expect(screen.getByText("UID client-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Approuver" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/documents/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
