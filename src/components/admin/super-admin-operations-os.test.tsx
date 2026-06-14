import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SuperAdminOperationsOS } from "@/components/admin/super-admin-operations-os";
import type {
  AdminCaseEvent,
  AdminClientProfile,
  AdminNotification,
  ClientCase,
  ClientDocument,
} from "@/types/admin-ops";

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
  verificationStatus: "PENDING",
  rejectionReason: null,
  uploadedAt: "2026-05-25T08:30:00.000Z",
  verifiedAt: null,
  verifiedBy: null,
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
function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

function mockOperationsFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/admin/operations/sync-auth-users")) {
      return jsonResponse({ result: { synced: 1, created: 1, updated: 0 } });
    }
    if (url.includes("/api/admin/clients/client-1")) {
      return jsonResponse({
        client: {
          profile: client,
          cases: [clientCase],
          documents: [documentRow],
          payments: [],
          financialFiles: [],
          certificates: [],
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
          casesTotal: 1,
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
      return jsonResponse({ cases: [clientCase] });
    }
    if (url.includes("/api/admin/documents")) {
      return jsonResponse({ documents: [documentRow] });
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

describe("SuperAdminOperationsOS", () => {
  it("renders real operations navigation, clients, notifications, and no fallback wording", async () => {
    mockOperationsFetch();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    expect(await screen.findByText("AVI CERTIFY Super Admin Operations OS")).toBeInTheDocument();
    for (const label of [
      "Vue d'ensemble",
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
    expect(screen.getByText(/Synchronisation Firebase Auth exécutée/)).toBeInTheDocument();
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

  it("keeps core Client 360 actions active and downstream actions disabled", async () => {
    const fetchMock = mockOperationsFetch();
    const user = userEvent.setup();

    render(<SuperAdminOperationsOS adminRole="super_admin" adminEmail="admin@avicertify.fr" />);

    await screen.findByText("AVI CERTIFY Super Admin Operations OS");
    await user.click(screen.getAllByRole("button", { name: "Clients" })[0]);
    await user.click(await screen.findByRole("button", { name: "Ouvrir 360" }));

    expect(await screen.findByRole("button", { name: "Demander document" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lier simulation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Générer devis" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rapport préfinancement" })).toBeDisabled();

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
