import { describe, expect, it } from "vitest";
import { leadFormSchema } from "@/lib/validations/lead";

const validLead = {
  fullName: "Awa Ndiaye",
  phone: "+237 699 000 000",
  email: "AWA@example.com",
  residenceCountry: "cameroun",
  destinationCountry: "france",
  requestedService: "avi",
  message: "Je prepare mon dossier pour la rentree.",
  consent: true,
};

describe("leadFormSchema", () => {
  it("accepts and normalizes a valid lead", () => {
    const result = leadFormSchema.parse(validLead);

    expect(result.email).toBe("awa@example.com");
  });

  it("rejects a lead without consent", () => {
    const result = leadFormSchema.safeParse({
      ...validLead,
      consent: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const result = leadFormSchema.safeParse({
      ...validLead,
      role: "admin",
    });

    expect(result.success).toBe(false);
  });
});

