import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuideRequestModal } from "@/components/guide/guide-request-modal";

function guideResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

function renderOpenModal() {
  const onOpenChange = vi.fn();

  render(
    <GuideRequestModal
      onOpenChange={onOpenChange}
      open
      origin="floating_cta"
    />,
  );

  return { onOpenChange };
}

describe("GuideRequestModal", () => {
  it("renders the guide request fields", () => {
    renderOpenModal();

    expect(
      screen.getByRole("dialog", { name: /installation en france/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pays de destination/i)).toHaveValue("France");
    expect(
      screen.getByLabelText(/consentement est requis/i),
    ).toBeInTheDocument();
  });

  it("rejects empty required fields before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderOpenModal();

    await user.click(screen.getByRole("button", { name: /envoyer ma demande/i }));

    expect(await screen.findByText(/indiquez votre nom complet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/renseignez une adresse email valide/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/le consentement est obligatoire/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires explicit marketing consent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderOpenModal();

    await user.type(screen.getByLabelText(/nom complet/i), "Awa Ndiaye");
    await user.type(screen.getByLabelText(/^email$/i), "awa@example.com");
    await user.click(screen.getByRole("button", { name: /envoyer ma demande/i }));

    expect(
      await screen.findByText(/le consentement est obligatoire/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the guide payload without exposing the lead id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      guideResponse(
        {
          ok: true,
          leadId: "lead-secret-1",
          status: "NEW",
          guideDeliveryStatus: "READY",
          guideDeliveryChannel: "client_space",
          guideEmailSent: true,
          guideEmailStatus: "SENT",
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderOpenModal();

    await user.type(screen.getByLabelText(/nom complet/i), " Awa  Ndiaye ");
    await user.type(screen.getByLabelText(/^email$/i), "AWA@example.com");
    await user.selectOptions(
      screen.getByLabelText(/horizon du projet/i),
      "rentree-2026",
    );
    await user.click(screen.getByLabelText(/consentement est requis/i));
    await user.click(screen.getByRole("button", { name: /envoyer ma demande/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/guide/request",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(requestInit.body)) as Record<string, unknown>;

    expect(payload).toMatchObject({
      fullName: "Awa Ndiaye",
      email: "awa@example.com",
      phone: null,
      country: null,
      destinationCountry: "France",
      serviceInterest: "guide_france_2026",
      projectHorizon: "rentree-2026",
      origin: "floating_cta",
      source: "guide",
      marketingConsent: true,
    });
    expect(payload.leadId).toBeUndefined();
    expect(await screen.findByText(/votre demande a bien/i)).toBeInTheDocument();
    expect(screen.queryByText("lead-secret-1")).not.toBeInTheDocument();
    expect(screen.queryByText(/telecharger/i)).not.toBeInTheDocument();
  });

  it("shows API errors when the response is ok false", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      guideResponse({
        ok: false,
        error: "Le consentement marketing est requis pour demander le guide.",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderOpenModal();

    await user.type(screen.getByLabelText(/nom complet/i), "Awa Ndiaye");
    await user.type(screen.getByLabelText(/^email$/i), "awa@example.com");
    await user.click(screen.getByLabelText(/consentement est requis/i));
    await user.click(screen.getByRole("button", { name: /envoyer ma demande/i }));

    expect(
      await screen.findByText(
        /le consentement marketing est requis pour demander le guide/i,
      ),
    ).toBeInTheDocument();
  });
});
