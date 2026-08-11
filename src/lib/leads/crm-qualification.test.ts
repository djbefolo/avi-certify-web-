import { describe, expect, it } from "vitest";
import {
  canTransitionLeadCrmStatus,
  deriveLeadQualificationReadiness,
  isLeadNextActionOverdue,
} from "@/lib/leads/crm-qualification";
import type { CanonicalLead } from "@/types/lead";

function lead(
  overrides: Partial<Omit<CanonicalLead, "crmStatus">> & {
    crmStatus?: "new" | "contacted" | "qualified" | "converted" | "lost";
    lastContactedAt?: string | null;
  } = {},
) {
  return {
    fullName: "Awa Ndiaye",
    email: "awa@example.com",
    phone: "+237600000000",
    residenceCountry: "cameroun",
    destinationCountry: "france",
    requestedService: "hebergement",
    projectHorizon: "septembre-2026",
    linkedUid: null,
    identityLinkStatus: "UNLINKED" as const,
    crmStatus: "new" as const,
    lastContactedAt: null,
    ...overrides,
  };
}

describe("CRM qualification readiness", () => {
  it("keeps linked and unlinked leads NEW while deriving readiness", () => {
    const unlinked = lead();
    const linked = lead({
      linkedUid: "user-1",
      identityLinkStatus: "LINKED",
    });

    expect(deriveLeadQualificationReadiness(unlinked)).toMatchObject({
      qualificationReadiness: "READY_FOR_REVIEW",
      profileReadiness: "INCOMPLETE",
    });
    expect(deriveLeadQualificationReadiness(linked)).toMatchObject({
      qualificationReadiness: "READY_FOR_REVIEW",
      profileReadiness: "INCOMPLETE",
    });
    expect(unlinked.crmStatus).toBe("new");
    expect(linked.crmStatus).toBe("new");
  });

  it("derives linked profile sufficiency without converting or qualifying", () => {
    const linked = lead({
      phone: null,
      destinationCountry: null,
      requestedService: null,
      linkedUid: "user-1",
      identityLinkStatus: "LINKED",
    });
    const readiness = deriveLeadQualificationReadiness(linked, {
      phoneWhatsApp: "+237600000000",
      destinationCountry: "france",
      selectedService: "attestation_hebergement",
    });

    expect(readiness).toMatchObject({
      qualificationReadiness: "READY_FOR_REVIEW",
      profileReadiness: "SUFFICIENT_FOR_QUALIFICATION",
    });
    expect(linked.crmStatus).toBe("new");
  });

  it("recognizes a complete profile without changing commercial status", () => {
    const linked = lead({
      linkedUid: "user-1",
      identityLinkStatus: "LINKED",
      crmStatus: "contacted",
    });
    const profile = {
      firstName: "Awa",
      lastName: "Ndiaye",
      birthDate: "1998-06-08",
      birthCountry: "cameroun",
      nationality: "camerounaise",
      countryOfResidence: "cameroun",
      destinationCountry: "france",
      destinationCity: "Rennes",
      targetSchoolName: "Université",
      intendedProgram: "Master",
      intendedAcademicYear: "2026-2027",
      intendedArrivalDate: "2026-09-01",
      selectedService: "attestation_hebergement",
    };

    expect(deriveLeadQualificationReadiness(linked, profile)).toMatchObject({
      profileReadiness: "COMPLETE",
      profileCompletionPercent: 100,
    });
    expect(linked.crmStatus).toBe("contacted");
  });

  it.each(["AMBIGUOUS", "CONFLICT"] as const)(
    "flags %s identity links for human review",
    (identityLinkStatus) => {
      expect(
        deriveLeadQualificationReadiness(
          lead({ identityLinkStatus, linkedUid: null }),
        ).humanFollowUpRequired,
      ).toBe(true);
    },
  );

  it("allows only the explicit Phase 2C status flow", () => {
    expect(canTransitionLeadCrmStatus("new", "contacted")).toBe(true);
    expect(canTransitionLeadCrmStatus("contacted", "qualified")).toBe(true);
    expect(canTransitionLeadCrmStatus("qualified", "lost")).toBe(true);
    expect(canTransitionLeadCrmStatus("new", "qualified")).toBe(false);
    expect(canTransitionLeadCrmStatus("qualified", "converted")).toBe(false);
  });

  it("derives overdue follow-up without scheduling or sending reminders", () => {
    expect(
      isLeadNextActionOverdue(
        "FOLLOW_UP",
        "2026-01-01T00:00:00.000Z",
        Date.parse("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      isLeadNextActionOverdue(
        "NONE",
        "2026-01-01T00:00:00.000Z",
        Date.parse("2026-01-02T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
