import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
const updateFieldsBlock = rules.slice(
  rules.indexOf("function userUpdateFields()"),
  rules.indexOf("function documentFields()"),
);

const profileWriterFields = [
  "firstName",
  "lastName",
  "fullName",
  "birthDate",
  "birthCountry",
  "phoneWhatsApp",
  "dateOfBirth",
  "placeOfBirth",
  "nationality",
  "countryOfResidence",
  "destinationCountry",
  "destinationCity",
  "targetSchoolName",
  "admissionStatus",
  "admissionDocumentStatus",
  "intendedProgram",
  "intendedAcademicYear",
  "intendedArrivalDate",
  "expectedStayDuration",
  "financialNeedType",
  "requestedAviAmount",
  "needsFinancing",
  "selectedService",
  "housingNeed",
  "preferredHousingCity",
  "previousVisaRefusal",
  "previousVisaRefusalCountry",
  "emergencyContactName",
  "emergencyContactPhone",
  "serviceInterest",
  "profileSource",
  "lastIntent",
  "updatedAt",
  "profileUpdatedAt",
] as const;

describe("Firestore user profile rules contract", () => {
  it("allows every field emitted by the client profile writer", () => {
    for (const field of profileWriterFields) {
      expect(updateFieldsBlock).toContain(`"${field}"`);
    }
  });

  it("keeps profile creation server-only and updates owner-scoped", () => {
    expect(rules).toContain("allow create: if false;");
    expect(rules).toContain("allow update: if isVerifiedOwner(userId)");
    expect(rules).toContain("request.auth.uid == userId");
  });

  it("keeps identity and administrative fields outside the client whitelist", () => {
    const serverOnlyFields = [
      "uid",
      "email",
      "role",
      "status",
      "createdAt",
      "createdVia",
      "clientOrigin",
      "marketingConsent",
      "marketingConsentAt",
      "emailVerifiedAt",
    ];

    for (const field of serverOnlyFields) {
      expect(updateFieldsBlock).not.toContain(`"${field}"`);
    }

    expect(rules).toContain(
      'request.resource.data.profileSource == "user_profile"',
    );
    expect(rules).toContain(
      'request.resource.data.lastIntent == "profile_update"',
    );
    expect(rules).toContain(
      "request.resource.data.serviceInterest == request.resource.data.selectedService",
    );
  });
});
