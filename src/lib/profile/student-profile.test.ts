import { describe, expect, it } from "vitest";
import {
  createEmptyEditableProfile,
  getProfileCompletion,
  getSelectedServiceLabel,
  mapStudentProfile,
} from "@/lib/profile/student-profile";

describe("student profile mapping", () => {
  it("maps real profile fields without inventing missing data", () => {
    const profile = mapStudentProfile("client-1", {
      firstName: "Awa",
      lastName: "Ndiaye",
      email: "awa@example.com",
      destinationCountry: "Canada",
      selectedService: "avi",
      admissionStatus: "not-a-real-status",
    });

    expect(profile).toMatchObject({
      uid: "client-1",
      email: "awa@example.com",
      firstName: "Awa",
      lastName: "Ndiaye",
      fullName: "Awa Ndiaye",
      destinationCountry: "Canada",
      selectedService: "avi",
      admissionStatus: null,
    });
    expect(profile.nationality).toBeNull();
  });

  it("keeps an empty editable profile empty", () => {
    expect(createEmptyEditableProfile()).toMatchObject({
      firstName: null,
      lastName: null,
      fullName: null,
      birthDate: null,
      birthCountry: null,
      destinationCountry: null,
      selectedService: null,
    });
  });

  it("reports incomplete and partial profile completion explicitly", () => {
    expect(getProfileCompletion(null)).toMatchObject({
      percent: 0,
      state: "incomplete",
    });

    const partialProfile = mapStudentProfile("client-1", {
      firstName: "Awa",
      lastName: "Ndiaye",
      birthDate: "2000-01-01",
    });

    const completion = getProfileCompletion(partialProfile);

    expect(completion.state).toBe("partial");
    expect(completion.percent).toBeGreaterThan(0);
    expect(completion.percent).toBeLessThan(100);
    expect(completion.missingFields).toContain("destinationCountry");
  });

  it("uses a clear empty label for missing selected service", () => {
    expect(getSelectedServiceLabel(null)).toBe("A renseigner");
  });
});
