import { describe, expect, it } from "vitest";
import { renderGuideAvailableEmail } from "@/lib/email/templates/guide-available";

describe("renderGuideAvailableEmail", () => {
  it("renders a secure guide email without public PDF links", () => {
    const template = renderGuideAvailableEmail({
      leadFullName: "Awa Ndiaye",
      dashboardUrl:
        "https://www.avicertify.fr/dashboard?resource=guide-france-2026",
    });

    expect(template.subject).toBe("Votre guide AVI CERTIFY est disponible");
    expect(template.text).toContain(
      "https://www.avicertify.fr/dashboard?resource=guide-france-2026",
    );
    expect(template.html).toContain("Acceder a mon espace client");
    expect(template.html).not.toContain(".pdf");
    expect(template.text).not.toContain(".pdf");
    expect(template.html).not.toContain("/api/client/resources");
    expect(template.text).not.toContain("/api/client/resources");
  });
});
