import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  latestRequest: vi.fn(),
  createRequest: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}));

vi.mock("@/lib/housing/housing-request.service", () => ({
  getLatestHousingRequestForOwner: mocks.latestRequest,
  createOrUpdateHousingRequest: mocks.createRequest,
}));

import { GET, POST } from "@/app/api/client/housing-request/route";

function serverHousingRequest() {
  return {
    id: "request-1",
    ownerId: "client-1",
    caseId: "case-1",
    clientEmail: "student@example.com",
    clientName: "Awa Student",
    serviceType: "conditional_housing_certificate",
    status: "awaiting_payment",
    studentFirstName: "Awa",
    studentLastName: "Student",
    studentPhone: "+33123456789",
    studentDateOfBirth: "2002-01-01",
    studentPlaceOfBirth: "Dakar",
    nationality: "Sénégalaise",
    originCountry: "Sénégal",
    currentResidenceCountry: "Sénégal",
    destinationCountry: "France",
    housingInventoryId: "AVI-LOG-FR-0001",
    preferredCityCode: "AIX_EN_PROVENCE",
    preferredCity: "Aix-en-Provence",
    schoolName: "Université",
    schoolCity: "Aix-en-Provence",
    academicYear: "2026-2027",
    expectedArrivalDate: "2026-09-01",
    expectedStayDurationMonths: 12,
    accommodationType: "studio",
    indicativeMonthlyRent: 627,
    currency: "EUR",
    specialNeeds: null,
    notes: null,
    consentAccuracy: true,
    consentConditionalNature: true,
    consentTerms: true,
    consentDataProcessing: true,
    consentAddressAdjustment: true,
    paymentId: null,
    allocation: null,
    selectionSnapshot: {
      inventorySource: "bootstrap",
      internalReference: "PRIVATE-REFERENCE",
      address: { formattedAddress: "Adresse interne confidentielle" },
      pricing: { monthlyRentForCertificate: 627 },
    },
    paymentSnapshot: null,
    autoDecisionSnapshot: { reasons: ["MANUAL_REVIEW_FORCED"] },
    adminApprovalSnapshot: null,
    certificateSnapshot: null,
    duplicateOrFraudRisk: false,
    generationJobId: null,
    generatedDocumentId: null,
    schemaVersion: 2,
    createdAt: "2026-08-04T10:00:00.000Z",
    updatedAt: "2026-08-04T10:00:00.000Z",
    paidAt: null,
  };
}

describe("client housing request API", () => {
  beforeEach(() => {
    mocks.createRequest.mockReset();
    mocks.verifyIdToken.mockResolvedValue({
      uid: "client-1",
      email: "student@example.com",
      email_verified: true,
    });
    mocks.latestRequest.mockResolvedValue(serverHousingRequest());
  });

  it("returns client-safe request fields without internal inventory snapshots", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/client/housing-request", {
        headers: { Authorization: "Bearer valid-token" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.request).toMatchObject({
      id: "request-1",
      caseId: "case-1",
      preferredCity: "Aix-en-Provence",
      indicativeMonthlyRent: 627,
      nationality: {
        countryCodeAlpha2: "SN",
        countryCodeAlpha3: "SEN",
        label: "Sénégalaise",
      },
      originCountry: {
        codeAlpha2: "SN",
        codeAlpha3: "SEN",
        label: "Sénégal",
      },
      destinationCountry: {
        codeAlpha2: "FR",
        codeAlpha3: "FRA",
        label: "France",
      },
    });
    expect(payload.request).not.toHaveProperty("selectionSnapshot");
    expect(payload.request).not.toHaveProperty("autoDecisionSnapshot");
    expect(payload.request).not.toHaveProperty("adminApprovalSnapshot");
    expect(payload.request).not.toHaveProperty("clientEmail");
    expect(payload.request).not.toHaveProperty("paymentId");
  });

  it("rejects an unsupported destination before creating a request", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/client/housing-request", {
        method: "POST",
        headers: {
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentFirstName: "Awa",
          studentLastName: "Student",
          studentPhone: "+33123456789",
          studentDateOfBirth: "2002-01-01",
          studentPlaceOfBirth: "Dakar",
          nationality: {
            countryCodeAlpha2: "SN",
            countryCodeAlpha3: "SEN",
            label: "Sénégalaise",
          },
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
          destinationCountry: {
            codeAlpha2: "CA",
            codeAlpha3: "CAN",
            label: "Canada",
          },
          preferredCityCode: "AIX_EN_PROVENCE",
          housingInventoryId: "AVI-LOG-FR-0001",
          schoolName: "Université",
          schoolCity: "Aix-en-Provence",
          academicYear: "2026-2027",
          expectedArrivalDate: "2099-09-01",
          expectedStayDurationMonths: 12,
          accommodationType: "studio",
          specialNeeds: "",
          notes: "",
          consentAccuracy: true,
          consentConditionalNature: true,
          consentTerms: true,
          consentDataProcessing: true,
          consentAddressAdjustment: true,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "HOUSING_REQUEST_INVALID",
    });
    expect(mocks.createRequest).not.toHaveBeenCalled();
  });
});
