import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  type Stored = Record<string, unknown>;
  const collections = new Map<string, Map<string, Stored>>();
  const email = vi.fn();
  let generatedId = 0;

  function collectionMap(name: string) {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name) as Map<string, Stored>;
  }

  function snapshot(id: string, value?: Stored) {
    return {
      id,
      exists: Boolean(value),
      data: () => value,
      get: (field: string) => value?.[field],
    };
  }

  function document(name: string, id: string) {
    return {
      id,
      name,
      get: async () => snapshot(id, collectionMap(name).get(id)),
      set: async (value: Stored, options?: { merge?: boolean }) => {
        const current = collectionMap(name).get(id) ?? {};
        collectionMap(name).set(id, options?.merge ? { ...current, ...value } : value);
      },
    };
  }

  const db = {
    collection: (name: string) => ({
      doc: (id?: string) =>
        document(name, id ?? `${name}-generated-${++generatedId}`),
      limit: (count: number) => ({
        get: async () => ({
          docs: [...collectionMap(name).entries()]
            .slice(0, count)
            .map(([id, value]) => snapshot(id, value)),
        }),
      }),
      where: (field: string, _operator: string, expected: unknown) => ({
        limit: () => ({
          get: async () => ({
            docs: [...collectionMap(name).entries()]
              .filter(([, value]) => value[field] === expected)
              .map(([id, value]) => snapshot(id, value)),
          }),
        }),
      }),
    }),
    batch: () => {
      const writes: Array<{
        ref: ReturnType<typeof document>;
        value: Stored;
        options?: { merge?: boolean };
      }> = [];
      return {
        set: (
          ref: ReturnType<typeof document>,
          value: Stored,
          options?: { merge?: boolean },
        ) => writes.push({ ref, value, options }),
        commit: async () => {
          for (const write of writes) {
            await write.ref.set(write.value, write.options);
          }
        },
      };
    },
    runTransaction: async (
      handler: (transaction: {
        get: (ref: ReturnType<typeof document>) => Promise<ReturnType<typeof snapshot>>;
        set: (
          ref: ReturnType<typeof document>,
          value: Stored,
          options?: { merge?: boolean },
        ) => void;
      }) => Promise<unknown>,
    ) => {
      const writes: Array<{
        ref: ReturnType<typeof document>;
        value: Stored;
        options?: { merge?: boolean };
      }> = [];
      const result = await handler({
        get: (ref) => ref.get(),
        set: (ref, value, options) => writes.push({ ref, value, options }),
      });
      for (const write of writes) {
        await write.ref.set(write.value, write.options);
      }
      return result;
    },
  };

  return {
    collections,
    collectionMap,
    db,
    email,
    resetIds() {
      generatedId = 0;
    },
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => mocks.db,
}));

vi.mock("@/lib/server/email.service", () => ({
  sendHousingReviewRequiredEmail: mocks.email,
  sendHousingAdminReviewRequiredEmail: mocks.email,
}));

import {
  createOrUpdateHousingRequest,
  evaluateHousingCertificateAfterPayment,
} from "@/lib/housing/housing-request.service";

function seedRequest() {
  mocks.collectionMap("housing_requests").set("request-1", {
    id: "request-1",
    ownerId: "client-1",
    caseId: "case-1",
    clientEmail: "student@example.com",
    clientName: "Awa Student",
    serviceType: "conditional_housing_certificate",
    status: "payment_pending",
    studentFirstName: "Awa",
    studentLastName: "Student",
    studentFullName: "Awa Student",
    studentPhone: "+33123456789",
    studentDateOfBirth: "2002-01-01",
    studentPlaceOfBirth: "Dakar",
    nationality: "Senegalaise",
    originCountry: "Senegal",
    currentResidenceCountry: "Senegal",
    destinationCountry: "France",
    housingInventoryId: "AVI-LOG-FR-0001",
    preferredCityCode: "aix-en-provence",
    preferredCity: "Aix-en-Provence",
    schoolName: "Universite",
    schoolCity: "Aix-en-Provence",
    academicYear: "2026-2027",
    expectedArrivalDate: "2026-09-01",
    expectedStayDurationMonths: 12,
    accommodationType: "studio",
    indicativeMonthlyRent: 627,
    currency: "EUR",
    consentAccuracy: true,
    consentConditionalNature: true,
    consentTerms: true,
    consentDataProcessing: true,
    consentAddressAdjustment: true,
    paymentId: "payment-1",
    allocation: null,
    selectionSnapshot: {
      selectedAt: "2026-08-01T10:00:00.000Z",
      housingInventoryId: "AVI-LOG-FR-0001",
      inventoryVersion: 1,
    },
    paymentSnapshot: {
      paymentId: "payment-1",
      amount: 9900,
      currency: "eur",
    },
    duplicateOrFraudRisk: false,
    generationJobId: null,
    generatedDocumentId: null,
    schemaVersion: 2,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  });
  mocks.collectionMap("payments").set("payment-1", {
    status: "paid",
    ownerId: "client-1",
    housingRequestId: "request-1",
    serviceType: "accommodation_certificate",
  });
  mocks.collectionMap("housing_inventory").set("AVI-LOG-FR-0001", {
    internalReference: "AVI-LOG-FR-0001",
    partner: { displayName: "SafeHouse" },
    residenceName: "Aix Campus 1",
    countryCode: "FR",
    countryName: "France",
    cityCode: "aix-en-provence",
    cityLabel: "Aix-en-Provence",
    municipality: "Aix-en-Provence",
    postalCode: "13090",
    address: {
      line1: "6 rue Jean Andreani",
      postalCode: "13090",
      city: "Aix-en-Provence",
      country: "France",
      formattedAddress: "6 rue Jean Andreani, 13090 Aix-en-Provence",
    },
    accommodationTypes: ["studio"],
    pricing: {
      currency: "EUR",
      monthlyRentForCertificate: 627,
      priceValidationStatus: "verified",
    },
    inventoryStatus: "conditionally_available",
    availabilityGuaranteed: false,
    autoIssuance: {
      enabled: true,
      eligibilityStatus: "eligible",
      validUntil: "2027-01-01T00:00:00.000Z",
      conditionalCapacity: 2,
      remainingConditionalCapacity: 2,
      arrivalDateFrom: "2026-08-01T00:00:00.000Z",
      arrivalDateUntil: "2026-12-31T23:59:59.999Z",
      approvedByAdminUid: "admin-1",
      approvedAt: "2026-08-01T00:00:00.000Z",
      manualReviewRequired: false,
    },
    availability: { confirmationReference: "partner-confirmation-1" },
    isVisibleToClients: true,
    isEligibleForCertificate: true,
    source: {},
    version: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  });
}

describe("housing payment decision", () => {
  beforeEach(() => {
    mocks.collections.clear();
    mocks.resetIds();
    mocks.email.mockReset();
    mocks.email.mockResolvedValue({
      sent: true,
      messageId: "email-1",
      status: "SENT",
      provider: "resend",
    });
    process.env.HOUSING_AUTO_ISSUANCE_ENABLED = "true";
    seedRequest();
  });

  it("queues one automatic job and reserves capacity only once", async () => {
    const input = {
      requestId: "request-1",
      paymentId: "payment-1",
      stripeEventId: "evt-1",
      paidAt: "2026-08-03T10:00:00.000Z",
    };
    const first = await evaluateHousingCertificateAfterPayment(input);
    const second = await evaluateHousingCertificateAfterPayment({
      ...input,
      stripeEventId: "evt-retry",
    });

    expect(first.decision.reasons).toEqual(["ELIGIBLE"]);
    expect(first.job?.id).toBe("housing_payment-1");
    expect(second.job?.id).toBe(first.job?.id);
    expect(
      (mocks.collectionMap("housing_inventory").get("AVI-LOG-FR-0001")
        ?.autoIssuance as { remainingConditionalCapacity: number })
        .remainingConditionalCapacity,
    ).toBe(1);
    expect(mocks.collectionMap("housing_requests").get("request-1")).toEqual(
      expect.objectContaining({
        status: "auto_approved_generation_queued",
        certificateSnapshot: expect.objectContaining({ source: "automatic_policy" }),
      }),
    );
  });

  it("routes to admin review and sends the review email once when the kill switch is off", async () => {
    process.env.HOUSING_AUTO_ISSUANCE_ENABLED = "false";
    const input = {
      requestId: "request-1",
      paymentId: "payment-1",
      stripeEventId: "evt-1",
      paidAt: "2026-08-03T10:00:00.000Z",
    };
    const first = await evaluateHousingCertificateAfterPayment(input);
    const second = await evaluateHousingCertificateAfterPayment(input);

    expect(first.automaticGenerationQueued).toBe(false);
    expect(first.decision.reasons).toContain("GLOBAL_KILL_SWITCH_DISABLED");
    expect(second.job).toBeNull();
    expect(mocks.collectionMap("document_generation_jobs").size).toBe(0);
    expect(mocks.collectionMap("housing_requests").get("request-1")?.status).toBe(
      "requires_admin_review",
    );
    expect(mocks.email).toHaveBeenCalledTimes(2);
    expect(mocks.collectionMap("communication_logs").get("housing_review_payment-1"))
      .toEqual(expect.objectContaining({ status: "SENT" }));
    expect(mocks.collectionMap("communication_logs").get("housing_review_admin_payment-1"))
      .toEqual(expect.objectContaining({
        status: "SENT",
        template: "housing_admin_review_required",
      }));
  });

  it("creates a bootstrap request from server data and always routes it to admin review", async () => {
    mocks.collections.clear();
    const request = await createOrUpdateHousingRequest({
      ownerId: "client-bootstrap",
      accountEmail: "student@example.com",
      input: {
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
          codeAlpha2: "FR",
          codeAlpha3: "FRA",
          label: "France",
        },
        preferredCityCode: "AIX_EN_PROVENCE",
        housingInventoryId: "AVI-LOG-FR-0001",
        schoolName: "Université",
        schoolCity: "Aix-en-Provence",
        academicYear: "2026-2027",
        expectedArrivalDate: "2026-09-01",
        expectedStayDurationMonths: 12,
        accommodationType: "studio",
        specialNeeds: "",
        notes: "",
        consentAccuracy: true,
        consentConditionalNature: true,
        consentTerms: true,
        consentDataProcessing: true,
        consentAddressAdjustment: true,
      },
    });

    expect(request.indicativeMonthlyRent).toBe(627);
    expect(request).toMatchObject({
      nationality: "Sénégalaise",
      nationalityReference: {
        countryCodeAlpha2: "SN",
        countryCodeAlpha3: "SEN",
      },
      originCountry: "Sénégal",
      originCountryReference: { codeAlpha2: "SN", codeAlpha3: "SEN" },
      currentResidenceCountry: "Sénégal",
      destinationCountry: "France",
    });
    expect(mocks.collectionMap("users").get("client-bootstrap")).toMatchObject({
      originCountry: "Sénégal",
      originCountryReference: {
        codeAlpha2: "SN",
        codeAlpha3: "SEN",
        label: "Sénégal",
      },
      nationality: "Sénégalaise",
      countryOfResidence: "Sénégal",
      destinationCountryReference: {
        codeAlpha2: "FR",
        codeAlpha3: "FRA",
        label: "France",
      },
    });
    expect(request.selectionSnapshot).toMatchObject({
      inventorySource: "bootstrap",
      manualReviewRequired: true,
      housingInventoryId: "AVI-LOG-FR-0001",
      pricing: { residenceDisplayedRent: 627 },
    });

    mocks.collectionMap("housing_requests").set(request.id, {
      ...(mocks.collectionMap("housing_requests").get(request.id) ?? {}),
      paymentId: "payment-bootstrap",
      status: "payment_pending",
    });
    mocks.collectionMap("payments").set("payment-bootstrap", {
      status: "paid",
      ownerId: "client-bootstrap",
      housingRequestId: request.id,
      serviceType: "accommodation_certificate",
    });
    process.env.HOUSING_AUTO_ISSUANCE_ENABLED = "true";

    const result = await evaluateHousingCertificateAfterPayment({
      requestId: request.id,
      paymentId: "payment-bootstrap",
      stripeEventId: "evt-bootstrap",
      paidAt: "2026-08-04T10:00:00.000Z",
    });

    expect(result.automaticGenerationQueued).toBe(false);
    expect(result.decision.reasons).toContain("MANUAL_REVIEW_FORCED");
    expect(result.job).toBeNull();
    expect(mocks.collectionMap("document_generation_jobs").size).toBe(0);
    expect(mocks.collectionMap("housing_requests").get(request.id)?.status).toBe(
      "requires_admin_review",
    );
  });
});
