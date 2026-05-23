import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postSimulation } from "@/app/api/admin/fintech/simulations/route";
import { POST as postQuote } from "@/app/api/admin/fintech/quotes/route";
import { PATCH as patchFx } from "@/app/api/admin/fintech/fx/route";
import { PATCH as patchPricing } from "@/app/api/admin/fintech/pricing-rules/route";
import { PATCH as patchRisk } from "@/app/api/admin/fintech/risk-rules/route";
import { GET as getAuditEvents } from "@/app/api/admin/fintech/audit-events/route";

function jsonRequest(url: string, body: unknown, headers?: HeadersInit) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function patchRequest(url: string, body: unknown, headers?: HeadersInit) {
  return new NextRequest(url, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const adminHeaders = { "x-admin-dev-token": "avi-local-admin" };

describe("admin fintech route security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated sensitive admin routes", async () => {
    const simulation = await postSimulation(
      jsonRequest("http://localhost/api/admin/fintech/simulations", {
        region: "eu",
        xafAmount: 8_000_000,
        contributionMonths: 3,
      }),
    );
    const quote = await postQuote(
      jsonRequest("http://localhost/api/admin/fintech/quotes", {
        clientIdentity: { email: "student@example.com" },
        simulationInput: {
          region: "eu",
          xafAmount: 8_000_000,
          contributionMonths: 3,
        },
      }),
    );
    const fx = await patchFx(
      patchRequest("http://localhost/api/admin/fintech/fx", {
        pair: "EUR/CAD",
        rate: 1.6,
      }),
    );
    const pricing = await patchPricing(
      patchRequest("http://localhost/api/admin/fintech/pricing-rules", {
        region: "eu",
        discountRateOptionA: 0.01,
      }),
    );
    const risk = await patchRisk(
      patchRequest("http://localhost/api/admin/fintech/risk-rules", {
        region: "eu",
      }),
    );

    expect(simulation.status).toBe(401);
    expect(quote.status).toBe(401);
    expect(fx.status).toBe(401);
    expect(pricing.status).toBe(401);
    expect(risk.status).toBe(401);
  });

  it("accepts the development/test admin token and records financial audit events", async () => {
    const simulation = await postSimulation(
      jsonRequest(
        "http://localhost/api/admin/fintech/simulations",
        {
          region: "canada",
          xafAmount: 8_000_000,
          contributionMonths: 3,
        },
        adminHeaders,
      ),
    );
    const pricing = await patchPricing(
      patchRequest(
        "http://localhost/api/admin/fintech/pricing-rules",
        {
          region: "canada",
          discountRateOptionA: 0.01,
        },
        adminHeaders,
      ),
    );
    const fx = await patchFx(
      patchRequest(
        "http://localhost/api/admin/fintech/fx",
        {
          pair: "EUR/CAD",
          rate: 1.603,
        },
        adminHeaders,
      ),
    );
    const auditResponse = await getAuditEvents(
      new NextRequest("http://localhost/api/admin/fintech/audit-events", {
        headers: adminHeaders,
      }),
    );
    const auditJson = (await auditResponse.json()) as {
      auditEvents: Array<{ type: string; action: string; resourceType: string }>;
    };

    expect(simulation.status).toBe(200);
    expect(pricing.status).toBe(200);
    expect(fx.status).toBe(200);
    expect(auditJson.auditEvents.some((event) => event.type === "simulation_created")).toBe(
      true,
    );
    expect(auditJson.auditEvents.some((event) => event.type === "pricing_changed")).toBe(
      true,
    );
    expect(auditJson.auditEvents.some((event) => event.type === "fx_changed")).toBe(
      true,
    );
    expect(
      auditJson.auditEvents.some((event) => event.action === "admin_access_granted"),
    ).toBe(true);
  });

  it("rejects the development admin token in production mode", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await postSimulation(
      jsonRequest(
        "http://localhost/api/admin/fintech/simulations",
        {
          region: "eu",
          xafAmount: 8_000_000,
          contributionMonths: 3,
        },
        adminHeaders,
      ),
    );

    expect(response.status).toBe(401);
  });
});
