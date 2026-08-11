import { describe, expect, it } from "vitest";
import {
  normalizeLead,
  normalizeLeadEmail,
  normalizeLeadStatus,
} from "@/lib/leads/normalize-lead";

describe("normalizeLead", () => {
  it("normalizes the observed NTALOULOU public lead without marketing inference", () => {
    const lead = normalizeLead("36eHSNLiJUM6ct1oxiki", {
      fullName: "NTALOULOU Arlodie Serge",
      email: "toufinamaoumbam@gmail.com",
      phone: "+242050542011",
      residenceCountry: "congo",
      destinationCountry: "france",
      requestedService: "hebergement",
      source: "landing_page",
      status: "new",
      consentAccepted: true,
      unknownHistoricalField: "preserved in Firestore, ignored by adapter",
    });

    expect(lead).toMatchObject({
      id: "36eHSNLiJUM6ct1oxiki",
      fullName: "NTALOULOU Arlodie Serge",
      email: "toufinamaoumbam@gmail.com",
      normalizedEmail: "toufinamaoumbam@gmail.com",
      phone: "+242050542011",
      residenceCountry: "congo",
      destinationCountry: "france",
      requestedService: "hebergement",
      crmStatus: "NEW",
      contactConsent: true,
      marketingConsent: false,
      source: "PUBLIC_CONTACT_FORM",
      linkedUid: null,
    });
    expect(lead).not.toHaveProperty("unknownHistoricalField");
  });

  it("normalizes a legacy guide lead and keeps explicit marketing consent separate", () => {
    const lead = normalizeLead("guide-legacy", {
      fullName: "Awa Ndiaye",
      email: "awa@example.com",
      country: "cameroun",
      serviceInterest: "guide_france_2026",
      projectHorizon: "rentree-2026",
      source: "guide",
      origin: "floating_cta",
      status: "NEW",
      marketingConsent: true,
    });

    expect(lead).toMatchObject({
      residenceCountry: "cameroun",
      requestedService: "guide_france_2026",
      projectHorizon: "rentree-2026",
      source: "GUIDE_DOWNLOAD",
      sourceDetail: "floating_cta",
      crmStatus: "NEW",
      marketingConsent: true,
      contactConsent: false,
    });
  });

  it.each(["new", "NEW"])("maps %s to the same canonical status", (status) => {
    expect(normalizeLeadStatus(status)).toBe("NEW");
  });

  it("prefers canonical country and service fields when both shapes exist", () => {
    const lead = normalizeLead("new-lead", {
      residenceCountry: "senegal",
      country: "legacy-country",
      requestedService: "avi",
      serviceInterest: "legacy-service",
      crmStatus: "contacted",
      source: "PUBLIC_CONTACT_FORM",
    });

    expect(lead).toMatchObject({
      residenceCountry: "senegal",
      requestedService: "avi",
      crmStatus: "CONTACTED",
      source: "PUBLIC_CONTACT_FORM",
    });
  });

  it("never promotes contact consent into marketing consent", () => {
    const lead = normalizeLead("public-lead", {
      consentAccepted: true,
      marketingConsent: false,
    });

    expect(lead.contactConsent).toBe(true);
    expect(lead.marketingConsent).toBe(false);
  });

  it("trims and lowercases email while preserving plus aliases", () => {
    expect(normalizeLeadEmail(" Test+Guide@Example.COM ")).toBe(
      "test+guide@example.com",
    );
  });

  it("returns safe null/default values for incomplete and malformed fields", () => {
    expect(
      normalizeLead("partial-lead", {
        fullName: 42,
        email: null,
        country: undefined,
        serviceInterest: {},
        status: "unexpected",
        marketingConsent: "yes",
      }),
    ).toMatchObject({
      id: "partial-lead",
      fullName: null,
      email: null,
      normalizedEmail: null,
      residenceCountry: null,
      requestedService: null,
      crmStatus: "NEW",
      contactConsent: false,
      marketingConsent: false,
      source: "UNKNOWN",
    });
  });
});
