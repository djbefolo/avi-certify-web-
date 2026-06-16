import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

const validRegistration = {
  firstName: "Awa",
  lastName: "Ndiaye",
  birthDate: "2001-04-15",
  birthCountry: "Cameroun",
  phone: "+237 699 000 000",
  email: "AWA@example.com",
  password: "Password-123!",
  confirmPassword: "Password-123!",
};

describe("registerSchema", () => {
  it("normalizes email for a valid registration", () => {
    const result = registerSchema.parse(validRegistration);

    expect(result.email).toBe("awa@example.com");
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
  });

  it("rejects weak passwords", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
  });
});
