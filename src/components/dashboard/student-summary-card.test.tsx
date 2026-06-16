import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudentSummaryCard } from "@/components/dashboard/student-summary-card";
import type { StudentProfile } from "@/types/student-profile";

function profile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    uid: "client-1",
    email: "client@example.com",
    firstName: null,
    lastName: null,
    fullName: null,
    birthDate: null,
    birthCountry: null,
    phoneWhatsApp: null,
    dateOfBirth: null,
    placeOfBirth: null,
    nationality: null,
    countryOfResidence: null,
    destinationCountry: null,
    destinationCity: null,
    targetSchoolName: null,
    admissionStatus: null,
    admissionDocumentStatus: null,
    intendedProgram: null,
    intendedAcademicYear: null,
    intendedArrivalDate: null,
    expectedStayDuration: null,
    financialNeedType: null,
    requestedAviAmount: null,
    needsFinancing: null,
    selectedService: null,
    housingNeed: null,
    preferredHousingCity: null,
    previousVisaRefusal: null,
    previousVisaRefusalCountry: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    role: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe("StudentSummaryCard", () => {
  it("renders empty profile values as fields to complete", () => {
    render(<StudentSummaryCard profile={null} />);

    expect(screen.getByText("Profil client")).toBeInTheDocument();
    expect(screen.getAllByText("A renseigner").length).toBeGreaterThan(5);
    expect(screen.queryByText(/Passeport valide/i)).not.toBeInTheDocument();
  });

  it("renders partial real profile values without inventing the rest", () => {
    render(
      <StudentSummaryCard
        profile={profile({
          fullName: "Awa Ndiaye",
          destinationCountry: "Canada",
          requestedAviAmount: 7380,
        })}
      />,
    );

    expect(screen.getByText("Awa Ndiaye")).toBeInTheDocument();
    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.getByText((content) => /7\s*380/.test(content))).toBeInTheDocument();
    expect(screen.getAllByText("A renseigner").length).toBeGreaterThan(1);
  });
});
