import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const getStoredManualAviPdf = vi.hoisted(() => vi.fn());

vi.mock("@/lib/avi/manual-avi-pdf.service", () => ({
  getStoredManualAviPdf,
}));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/admin/avi/AVI-FR-26-CMR-01-00001011/download", {
    method: "GET",
    headers: {
      "x-admin-dev-token": "avi-local-admin",
      ...headers,
    },
  });
}

const context = {
  params: Promise.resolve({ reference: "AVI-FR-26-CMR-01-00001011" }),
};

describe("/api/admin/avi/[reference]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStoredManualAviPdf.mockResolvedValue({
      buffer: Buffer.from("%PDF official avi"),
      reference: "AVI-FR-26-CMR-01-00001011",
      storagePath: "avi-certificates/AVI-FR-26-CMR-01-00001011.pdf",
      fileName: "AVI-FR-26-CMR-01-00001011.pdf",
    });
  });

  it("requires admin authentication", async () => {
    const response = await GET(request({ "x-admin-dev-token": "" }), context);

    expect(response.status).toBe(401);
    expect(getStoredManualAviPdf).not.toHaveBeenCalled();
  });

  it("serves the stored official PDF as an attachment", async () => {
    const response = await GET(request(), context);
    const buffer = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-avi-reference")).toBe("AVI-FR-26-CMR-01-00001011");
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  });
});
