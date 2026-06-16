import { describe, expect, it } from "vitest";
import { renderQuoteReadyEmail } from "./quote-ready";

describe("quote-ready email", () => {
  it("escapes client-controlled values and points to the secure quote page", () => {
    const template = renderQuoteReadyEmail({
      clientName: "<script>alert(1)</script>",
      quoteId: "<quote-1>",
      dashboardUrl: 'https://www.avicertify.fr/dossier/devis?next="quotes"',
    });

    expect(template.subject).toBe("Votre devis AVI CERTIFY est disponible");
    expect(template.html).not.toContain("<script>");
    expect(template.html).toContain("&lt;script&gt;");
    expect(template.html).toContain("&lt;quote-1&gt;");
    expect(template.html).toContain("&quot;quotes&quot;");
    expect(template.text).toContain("/dossier/devis");
  });
});
