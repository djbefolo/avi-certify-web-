import { describe, expect, it } from "vitest";
import { housingRequestInputSchema } from "@/lib/validations/housing";

function validHousingInput() {
  return {
    studentFirstName: "Gérard",
    studentLastName: "Minko",
    studentPhone: "+33 7 00 00 00 00",
    studentDateOfBirth: "2001-02-03",
    studentPlaceOfBirth: "Yaoundé",
    nationality: {
      countryCodeAlpha2: "CM",
      countryCodeAlpha3: "CMR",
      label: "Camerounaise",
    },
    originCountry: {
      codeAlpha2: "CM",
      codeAlpha3: "CMR",
      label: "Cameroun",
    },
    currentResidenceCountry: {
      codeAlpha2: "FR",
      codeAlpha3: "FRA",
      label: "France",
    },
    destinationCountry: {
      codeAlpha2: "FR",
      codeAlpha3: "FRA",
      label: "France",
    },
    preferredCityCode: "TOULOUSE",
    housingInventoryId: "AVI-LOG-FR-0037",
    schoolName: "Université de Toulouse",
    schoolCity: "Toulouse",
    academicYear: "2026-2027",
    expectedArrivalDate: "2099-09-01",
    expectedStayDurationMonths: 12,
    accommodationType: "studio",
    specialNeeds: "",
    notes: "Prénom conservé avec ses accents.",
    consentAccuracy: true,
    consentConditionalNature: true,
    consentTerms: true,
    consentDataProcessing: true,
    consentAddressAdjustment: true,
  };
}

describe("housing request structured geography", () => {
  it("accepts controlled country and nationality references", () => {
    expect(housingRequestInputSchema.parse(validHousingInput())).toMatchObject({
      studentFirstName: "Gérard",
      studentPlaceOfBirth: "Yaoundé",
      originCountry: { codeAlpha2: "CM", codeAlpha3: "CMR" },
      destinationCountry: { codeAlpha2: "FR", codeAlpha3: "FRA" },
    });
  });

  it("refuses a destination other than France on the server", () => {
    const result = housingRequestInputSchema.safeParse({
      ...validHousingInput(),
      destinationCountry: {
        codeAlpha2: "CA",
        codeAlpha3: "CAN",
        label: "Canada",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.destinationCountry).toContain(
        "La destination autorisée pour ce service est la France.",
      );
    }
  });

  it("refuses mismatched country codes and labels", () => {
    const result = housingRequestInputSchema.safeParse({
      ...validHousingInput(),
      originCountry: {
        codeAlpha2: "CM",
        codeAlpha3: "FRA",
        label: "Cameroun",
      },
    });

    expect(result.success).toBe(false);
  });
});
