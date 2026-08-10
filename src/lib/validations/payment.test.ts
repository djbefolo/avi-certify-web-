import { describe, expect, it } from "vitest";
import { checkoutRequestSchema } from "@/lib/validations/payment";

describe("checkoutRequestSchema", () => {
  it("accepts a known service type", () => {
    expect(
      checkoutRequestSchema.parse({ serviceType: "avi_support" }),
    ).toEqual({ serviceType: "avi_support" });
  });

  it("rejects unknown service types", () => {
    const result = checkoutRequestSchema.safeParse({
      serviceType: "custom_price",
    });

    expect(result.success).toBe(false);
  });

  it("rejects client-supplied price fields", () => {
    const result = checkoutRequestSchema.safeParse({
      serviceType: "avi_support",
      amount: 1,
    });

    expect(result.success).toBe(false);
  });

  it("requires a server-owned housing request for certificate checkout", () => {
    expect(
      checkoutRequestSchema.safeParse({
        serviceType: "accommodation_certificate",
      }).success,
    ).toBe(false);
    expect(
      checkoutRequestSchema.parse({
        serviceType: "accommodation_certificate",
        housingRequestId: "housing_request_123",
      }),
    ).toEqual({
      serviceType: "accommodation_certificate",
      housingRequestId: "housing_request_123",
    });
  });
});
