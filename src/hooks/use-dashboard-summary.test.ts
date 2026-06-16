import { describe, expect, it } from "vitest";
import { buildDashboardSummary } from "@/hooks/use-dashboard-summary";
import { emptyCertificateSummary } from "@/lib/dashboard/dashboard-data.service";
import type { ApplicationDocument, ApplicationPayment } from "@/types/application";
import type { DashboardSummary } from "@/types/dashboard";
import type { StudentProfile } from "@/types/student-profile";

const approvedDocuments: ApplicationDocument[] = [
  {
    id: "passport",
    title: "Passeport",
    description: "Passeport reel",
    status: "approved",
    workflowStatus: "approved",
    required: true,
  },
  {
    id: "admission_letter",
    title: "Admission",
    description: "Admission reelle",
    status: "approved",
    workflowStatus: "approved",
    required: true,
  },
  {
    id: "financial_proof",
    title: "Finance",
    description: "Finance reelle",
    status: "approved",
    workflowStatus: "approved",
    required: true,
  },
];

const paidPayment: ApplicationPayment = {
  id: "payment-1",
  status: "paid",
  amountLabel: "120 EUR",
  description: "Paiement reel",
};

const incompleteProfile: DashboardSummary["profile"] = {
  data: null,
  completionPercent: 0,
  completionState: "incomplete",
  completionSections: [],
};

function studentProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    uid: "client-1",
    email: "client@example.com",
    firstName: "Awa",
    lastName: "Ndiaye",
    fullName: "Awa Ndiaye",
    birthDate: "2000-01-01",
    birthCountry: "Cameroun",
    phoneWhatsApp: null,
    dateOfBirth: "2000-01-01",
    placeOfBirth: "Douala",
    nationality: "Camerounaise",
    countryOfResidence: "Cameroun",
    destinationCountry: "Canada",
    destinationCity: "Montreal",
    targetSchoolName: "Universite de Montreal",
    admissionStatus: "admitted",
    admissionDocumentStatus: "provided",
    intendedProgram: "Master",
    intendedAcademicYear: "2026",
    intendedArrivalDate: "2026-09-01",
    expectedStayDuration: "12 mois",
    financialNeedType: "avi",
    requestedAviAmount: 7380,
    needsFinancing: "yes",
    selectedService: "avi",
    housingNeed: "not_sure",
    preferredHousingCity: null,
    previousVisaRefusal: "no",
    previousVisaRefusalCountry: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    role: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("buildDashboardSummary", () => {
  it("does not mark a dashboard complete without a real profile", () => {
    const summary = buildDashboardSummary({
      documents: approvedDocuments,
      payment: paidPayment,
      profile: incompleteProfile,
      certificate: emptyCertificateSummary,
    });

    expect(summary.applicationStatus).toBe("account_created");
    expect(summary.applicationStatusLabel).toBe("Profil a renseigner");
    expect(summary.completionPercent).toBe(0);
    expect(summary.nextAction.href).toBe("/profil");
    expect(summary.timeline[0]).toEqual(
      expect.objectContaining({
        id: "profile",
        status: "current",
      }),
    );
  });

  it("keeps a partial profile as the next action before documents or payment", () => {
    const summary = buildDashboardSummary({
      documents: approvedDocuments,
      payment: paidPayment,
      profile: {
        data: studentProfile({ destinationCountry: null }),
        completionPercent: 85,
        completionState: "partial",
        completionSections: [{ label: "Projet etudiant", percent: 80 }],
      },
      certificate: emptyCertificateSummary,
    });

    expect(summary.applicationStatusLabel).toBe("Profil a completer");
    expect(summary.destinationCountry).toBe("A renseigner");
    expect(summary.nextAction.ctaLabel).toBe("Completer mon profil");
  });

  it("uses the dossier workflow only once the profile is complete", () => {
    const summary = buildDashboardSummary({
      documents: approvedDocuments,
      payment: paidPayment,
      profile: {
        data: studentProfile(),
        completionPercent: 100,
        completionState: "complete",
        completionSections: [],
      },
      certificate: emptyCertificateSummary,
    });

    expect(summary.applicationStatus).toBe("approved");
    expect(summary.applicationStatusLabel).toBe("Dossier valide");
    expect(summary.destinationCountry).toBe("Canada");
  });
});
