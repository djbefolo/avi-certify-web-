import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

const validRegistration = {
  fullName: "Awa Ndiaye",
  phone: "+237 699 000 000",
  email: "AWA@example.com",
  password: "password-secure",
  confirmPassword: "password-secure",
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

