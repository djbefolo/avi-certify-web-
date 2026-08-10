import { describe, expect, it } from "vitest";
import {
  franceCountryReference,
  resolveCountryReference,
  resolveNationalityReference,
} from "@/lib/profile/country-reference";

describe("country and nationality references", () => {
  it("migrates legacy strings without losing French labels", () => {
    expect(resolveCountryReference("Cameroun")).toEqual({
      codeAlpha2: "CM",
      codeAlpha3: "CMR",
      label: "Cameroun",
    });
    expect(resolveCountryReference("Senegal")).toEqual({
      codeAlpha2: "SN",
      codeAlpha3: "SEN",
      label: "Sénégal",
    });
    expect(resolveNationalityReference("Senegalaise")).toEqual({
      countryCodeAlpha2: "SN",
      countryCodeAlpha3: "SEN",
      label: "Sénégalaise",
    });
  });

  it("rejects inconsistent or unknown structured values", () => {
    expect(
      resolveCountryReference({
        codeAlpha2: "CM",
        codeAlpha3: "FRA",
        label: "Cameroun",
      }),
    ).toBeNull();
    expect(resolveNationalityReference("Inconnue")).toBeNull();
  });

  it("keeps France as the controlled housing destination", () => {
    expect(franceCountryReference).toEqual({
      codeAlpha2: "FR",
      codeAlpha3: "FRA",
      label: "France",
    });
  });
});
