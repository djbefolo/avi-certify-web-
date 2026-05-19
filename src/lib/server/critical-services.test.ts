import { describe, expect, it, vi } from "vitest";
import type { LeadFormValues } from "@/lib/validations/lead";
import { renderLeadConfirmationEmail } from "@/lib/email/templates/lead-confirmation";

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "server-timestamp"),
  },
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: vi.fn(),
  getAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripeServerClient: vi.fn(),
}));

const lead: LeadFormValues = {
  fullName: "Awa Ndiaye",
  phone: "+237 699 000 000",
  email: "awa@example.com",
  residenceCountry: "cameroun",
  destinationCountry: "france",
  requestedService: "avi",
  message: "Je prepare mon dossier.",
  consent: true,
};

describe("critical service contracts", () => {
  it("maps leads to a strict Firestore document controlled by the server", async () => {
    const { mapLeadToFirestore } = await import("@/lib/server/leads.service");

    const document = mapLeadToFirestore({
      ...lead,
      source: "landing_page",
      receivedAt: 1_789_560_000_000,
      requestContext: {
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
      },
    });

    expect(document).toMatchObject({
      fullName: "Awa Ndiaye",
      email: "awa@example.com",
      source: "landing_page",
      status: "new",
      consentAccepted: true,
      receivedAt: 1_789_560_000_000,
      metadata: {
        ipAddress: "203.0.113.10",
        userAgent: "Vitest",
      },
    });
    expect(document.createdAt).toBe("server-timestamp");
    expect(document.updatedAt).toBe("server-timestamp");
    expect(document.consentAcceptedAt).toBe("server-timestamp");
  });

  it("keeps payment pricing and currency in server-owned configuration", async () => {
    const { getPaymentServiceConfig } = await import(
      "@/lib/server/payments.service"
    );

    const config = getPaymentServiceConfig("avi_support");

    expect(config).toMatchObject({
      type: "avi_support",
      amount: 9900,
      currency: "eur",
      metadata: {
        serviceCode: "avi_support",
        productFamily: "student_services",
      },
    });
  });

  it("renders lead emails with HTML escaping and text fallback", () => {
    const template = renderLeadConfirmationEmail({
      ...lead,
      fullName: "<script>alert('x')</script>",
    });

    expect(template.subject).toContain("AVI CERTIFY");
    expect(template.text).toContain("Service demande");
    expect(template.html).toContain("&lt;script&gt;");
    expect(template.html).not.toContain("<script>alert");
  });

  it("keeps analytics as a safe no-op when PostHog is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.resetModules();

    const { captureAnalyticsEvent, initPostHog, isPostHogConfigured } =
      await import("@/lib/analytics/posthog");

    expect(isPostHogConfigured()).toBe(false);
    expect(initPostHog()).toBe(false);
    expect(captureAnalyticsEvent("page_view", { path: "/" })).toBe(false);
  });
});
