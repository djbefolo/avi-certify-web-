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
});

