import { describe, expect, it } from "vitest";
import {
  housingAllocationInputSchema,
  housingRequestInputSchema,
} from "@/lib/validations/housing";

function futureDate(days = 30) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validRequest() {
  return {
    studentFirstName: "Awa",
    studentLastName: "Ndiaye",
    studentPhone: "+221700000000",
    studentDateOfBirth: "2003-04-12",
    studentPlaceOfBirth: "Dakar",
    nationality: "Senegalaise",
    originCountry: "Senegal",
    currentResidenceCountry: "Senegal",
    destinationCountry: "France" as const,
    preferredCityCode: "lyon",
    housingInventoryId: "AVI-LOG-FR-0021",
    schoolName: "Universite de Lyon",
    schoolCity: "Lyon",
    academicYear: "2026-2027",
    expectedArrivalDate: futureDate(),
    expectedStayDurationMonths: 12,
    accommodationType: "studio" as const,
    specialNeeds: "",
    notes: "",
    consentAccuracy: true as const,
    consentConditionalNature: true as const,
    consentTerms: true as const,
    consentDataProcessing: true as const,
    consentAddressAdjustment: true as const,
  };
}

describe("housing request validation", () => {
  it("accepts a complete conditional housing request", () => {
    expect(housingRequestInputSchema.parse(validRequest())).toMatchObject({
      studentFirstName: "Awa",
      preferredCityCode: "lyon",
    });
  });

  it.each([
    ["studentFirstName", ""],
    ["preferredCityCode", ""],
    ["expectedArrivalDate", "2020-01-01"],
    ["notes", "<script>alert(1)</script>"],
    ["consentConditionalNature", false],
  ])("rejects invalid %s", (field, value) => {
    expect(() =>
      housingRequestInputSchema.parse({ ...validRequest(), [field]: value }),
    ).toThrow();
  });

  it("rejects calendar dates that JavaScript would otherwise normalize", () => {
    expect(() =>
      housingRequestInputSchema.parse({
        ...validRequest(),
        studentDateOfBirth: "2001-02-31",
      }),
    ).toThrow();
  });

  it("rejects an invalid partner allocation rent and date", () => {
    expect(() =>
      housingAllocationInputSchema.parse({
        inventoryReference: "SAFE-001",
        partnerName: "Partner",
        residenceName: "Residence",
        addressLine: "1 rue Exemple",
        postalCode: "69001",
        city: "Lyon",
        accommodationType: "studio",
        monthlyRent: -1,
        currency: "EUR",
        confirmedAt: futureDate(10),
        confirmationReference: "EMAIL-001",
        validUntil: futureDate(5),
        allocationReason: "Confirmation ecrite recue.",
      }),
    ).toThrow();
  });
});
