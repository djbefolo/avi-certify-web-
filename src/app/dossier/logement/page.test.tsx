import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getIdToken = vi.fn(async () => "client-token");
  return {
    getIdToken,
    getStudentProfile: vi.fn(),
    user: {
      uid: "client-1",
      email: "student@example.com",
      getIdToken,
    },
  };
});

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: mocks.user,
    isEmailVerified: true,
  }),
}));

vi.mock("@/lib/profile/student-profile", () => ({
  getStudentProfile: mocks.getStudentProfile,
}));

vi.mock("@/components/dashboard/dashboard-layout", () => ({
  DashboardLayout: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </main>
  ),
}));

import HousingRequestPage from "@/app/dossier/logement/page";

const city = {
  code: "AIX_EN_PROVENCE",
  label: "Aix-en-Provence",
  country: "France",
  residenceCount: 3,
  minimumDisplayedRent: 582,
  currency: "EUR",
  availabilityLabel: "Pré-réservation conditionnelle",
};

const residence = {
  id: "AVI-LOG-FR-0001",
  internalReference: "AVI-LOG-FR-0001",
  cityCode: "AIX_EN_PROVENCE",
  cityLabel: "Aix-en-Provence",
  municipality: "Aix-en-Provence",
  postalCode: "13090",
  residenceName: "Aix Campus 1",
  partnerName: "SafeHouse",
  accommodationTypes: ["studio", "t1_bis"],
  indicativeMonthlyRent: 517.5,
  monthlyRent: 517.5,
  cityIndicativePrice: 517.5,
  currency: "EUR",
  availabilityStatus: "confirmation_required",
  availabilityLabel: "Disponibilité à confirmer avec le partenaire",
  processingMode: "manual_review",
  publicDescription: "À confirmer avec le partenaire",
  publicAddress: null,
};

describe("housing client journey", () => {
  beforeEach(() => {
    mocks.getStudentProfile.mockResolvedValue({
      firstName: "Gérard",
      lastName: "Minko",
      phoneWhatsApp: "+33123456789",
      dateOfBirth: "2002-01-01",
      placeOfBirth: "Dakar",
      nationality: "Sénégalaise",
      birthCountry: "Sénégal",
      countryOfResidence: "Sénégal",
      targetSchoolName: "Université d'Aix",
      destinationCity: "Aix-en-Provence",
      intendedAcademicYear: "2099-2100",
      intendedArrivalDate: "2099-09-01",
      expectedStayDuration: "12",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/client/housing-request" && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({
              request: {
                id: "request-1",
                status: "awaiting_payment",
                preferredCity: "Aix-en-Provence",
              },
            }),
          } as Response;
        }
        if (url === "/api/client/housing-request") {
          return {
            ok: true,
            json: async () => ({ request: null }),
          } as Response;
        }
        if (url === "/api/client/housing/cities") {
          return {
            ok: true,
            json: async () => ({ source: "bootstrap", cities: [city] }),
          } as Response;
        }
        if (url.includes("/api/client/housing/residences")) {
          return {
            ok: true,
            json: async () => ({ source: "bootstrap", residences: [residence] }),
          } as Response;
        }
        if (url === "/api/stripe/create-checkout-session") {
          return {
            ok: false,
            json: async () => ({ error: "TEST_CHECKOUT_STOP" }),
          } as Response;
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  it("guides the student through four client-linked steps without early checkout", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    render(<HousingRequestPage />);

    expect(await screen.findByText("Aucune demande de logement en cours.")).toBeInTheDocument();
    expect(screen.getByTestId("housing-step-1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Gérard")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Pays d'origine" })).toHaveValue(
      "Sénégal",
    );
    expect(
      screen.getByRole("combobox", { name: "Pays de résidence actuel" }),
    ).toHaveValue("Sénégal");
    expect(screen.getByRole("combobox", { name: "Nationalité" })).toHaveValue(
      "Sénégalaise",
    );

    await user.click(screen.getByRole("button", { name: /Continuer/i }));
    expect(screen.getByTestId("housing-step-2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Continuer/i }));
    expect(screen.getByTestId("housing-step-3")).toBeInTheDocument();

    expect(screen.getAllByLabelText("Ville souhaitée")).toHaveLength(1);
    const cityCombobox = screen.getByRole("combobox", { name: "Ville souhaitée" });
    await user.click(cityCombobox);
    await user.type(cityCombobox, "aix");
    expect(
      screen.getByRole("option", {
        name: /Aix-en-Provence.*3 résidences.*582 EUR\/mois/i,
      }),
    ).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Aix Campus 1/ })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText("Résidence souhaitée"), "AVI-LOG-FR-0001");

    expect(screen.getByTestId("selected-residence-card")).toHaveTextContent(
      "517,50 EUR/mois",
    );
    expect(screen.getByTestId("selected-residence-card")).toHaveTextContent(
      "L'adresse exacte sera confirmée après vérification",
    );
    await user.selectOptions(screen.getByLabelText("Type de logement souhaité"), "t1_bis");
    await user.click(
      screen.getByRole("button", { name: "Réinitialiser ville souhaitée" }),
    );
    expect(screen.getByLabelText("Résidence souhaitée")).toHaveValue("");
    expect(screen.getByLabelText("Type de logement souhaité")).toHaveValue("");
    await user.type(cityCombobox, "aix");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Aix Campus 1/ })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText("Résidence souhaitée"), "AVI-LOG-FR-0001");
    expect(screen.getByLabelText("Type de logement souhaité")).toHaveValue("studio");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/stripe/create-checkout-session",
      expect.anything(),
    );

    await user.click(screen.getByRole("button", { name: /Vérifier ma demande/i }));
    expect(screen.getByTestId("housing-step-4")).toBeInTheDocument();
    expect(screen.getByText(/Gérard Minko/)).toBeInTheDocument();
    expect(screen.getByText(/Origine : Sénégal · Résidence : Sénégal/)).toBeInTheDocument();
    expect(screen.getByText(/Destination : France/)).toBeInTheDocument();
    expect(screen.getByText("Montant réglé maintenant")).toBeInTheDocument();
    expect(screen.getByTestId("housing-payment-button")).toHaveTextContent(
      "Payer 99 € et transmettre ma demande",
    );
    expect(document.body.textContent).not.toMatch(/Ã|Â/);
  });

  it("sends only client choices to the server after all consents", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    render(<HousingRequestPage />);
    await screen.findByText("Aucune demande de logement en cours.");

    await user.click(screen.getByRole("button", { name: /Continuer/i }));
    await user.click(screen.getByRole("button", { name: /Continuer/i }));
    const cityCombobox = screen.getByRole("combobox", { name: "Ville souhaitée" });
    await user.click(cityCombobox);
    await user.type(cityCombobox, "aix");
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => screen.getByRole("option", { name: /Aix Campus 1/ }));
    await user.selectOptions(screen.getByLabelText("Résidence souhaitée"), "AVI-LOG-FR-0001");
    await user.click(screen.getByRole("button", { name: /Vérifier ma demande/i }));

    for (const checkbox of screen.getAllByRole("checkbox")) {
      await user.click(checkbox);
    }
    await user.click(screen.getByTestId("housing-payment-button"));

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === "/api/client/housing-request" && init?.method === "POST",
      );
      expect(saveCall).toBeDefined();
      const body = JSON.parse(String(saveCall?.[1]?.body));
      expect(body).toMatchObject({
        originCountry: {
          codeAlpha2: "SN",
          codeAlpha3: "SEN",
          label: "Sénégal",
        },
        currentResidenceCountry: {
          codeAlpha2: "SN",
          codeAlpha3: "SEN",
          label: "Sénégal",
        },
        nationality: {
          countryCodeAlpha2: "SN",
          countryCodeAlpha3: "SEN",
          label: "Sénégalaise",
        },
        destinationCountry: {
          codeAlpha2: "FR",
          codeAlpha3: "FRA",
          label: "France",
        },
        preferredCityCode: "AIX_EN_PROVENCE",
        housingInventoryId: "AVI-LOG-FR-0001",
        accommodationType: "studio",
      });
      expect(body).not.toHaveProperty("indicativeMonthlyRent");
      expect(body).not.toHaveProperty("publicAddress");
      expect(body).not.toHaveProperty("processingMode");
    });
  });
});
