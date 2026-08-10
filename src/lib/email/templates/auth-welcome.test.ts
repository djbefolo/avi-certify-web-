import { describe, expect, it } from "vitest";
import { renderAuthWelcomeEmail } from "@/lib/email/templates/auth-welcome";

const PROFILE_URL = "https://www.avicertify.fr/profil";

describe("renderAuthWelcomeEmail", () => {
  it("renders the canonical profile CTA and its text fallback", () => {
    const template = renderAuthWelcomeEmail({
      email: "awa@example.com",
      fullName: "Awa Ndiaye",
    });

    expect(template.subject).toBe("Bienvenue dans votre espace AVI CERTIFY");
    expect(template.html).toContain("Compléter mon profil");
    expect(template.html).toContain(`href="${PROFILE_URL}"`);
    expect(template.html).toContain(
      "Si le bouton ne fonctionne pas, ouvrez :",
    );
    expect(template.text).toContain(`Compléter mon profil : ${PROFILE_URL}`);
    expect(template.text).toContain(
      `Si le bouton ne fonctionne pas, ouvrez : ${PROFILE_URL}`,
    );
    expect(template.html).not.toContain("/verification-email");
    expect(template.text).not.toContain("/verification-email");
  });

  it("keeps client-controlled display names escaped in HTML", () => {
    const template = renderAuthWelcomeEmail({
      email: "awa@example.com",
      fullName: "<script>alert(1)</script>",
    });

    expect(template.html).not.toContain("<script>");
    expect(template.html).toContain("&lt;script&gt;");
  });
});
