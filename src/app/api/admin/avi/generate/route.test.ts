import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/avi/generate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-dev-token": "avi-local-admin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/avi/generate", () => {
  it("requires admin authentication", async () => {
    const response = await POST(
      request(
        {
          studentFullName: "Awa Student",
          aviAmount: 7420,
          academicYear: "2026-2027",
        },
        { "x-admin-dev-token": "" },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid payloads before PDF generation", async () => {
    const response = await POST(
      request({
        studentFullName: "",
        aviAmount: 7420,
        academicYear: "2026-2027",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Payload AVI invalide.");
  });

  it("rejects invalid amounts", async () => {
    const response = await POST(
      request({
        studentFullName: "Awa Student",
        aviAmount: -10,
        academicYear: "2026-2027",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects oversized payloads", async () => {
    const response = await POST(
      request(
        {
          studentFullName: "Awa Student",
          aviAmount: 7420,
          academicYear: "2026-2027",
        },
        { "content-length": "20000" },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error).toMatch(/trop volumineuse/i);
  });

  it("returns an attachment PDF for a valid admin request", async () => {
    const response = await POST(
      request({
        studentFullName: "Awa Student",
        studentEmail: "awa@example.com",
        destinationCountry: "France",
        aviAmount: 7420,
        currency: "EUR",
        academicYear: "2026-2027",
        issueDate: "2026-07-02",
        aviReference: "AVI-2026-MANUAL-TEST01",
        notesForAdmin: "Internal note only.",
      }),
    );
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-avi-reference")).toBe("AVI-2026-MANUAL-TEST01");
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});

