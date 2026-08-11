import { describe, expect, it } from "vitest";
import {
  PROFILE_REMINDER_URL,
  renderProfileIncompleteReminderEmail,
} from "@/lib/email/templates/profile-incomplete-reminder";

describe("profile incomplete reminder email", () => {
  it("renders a short transactional reminder with the canonical profile CTA", () => {
    const email = renderProfileIncompleteReminderEmail({
      email: "awa@example.com",
      fullName: "Awa Ndiaye",
    });

    expect(email.subject).toBe("Complétez votre profil AVI CERTIFY");
    expect(email.html).toContain("Compléter mon profil");
    expect(email.html).toContain(PROFILE_REMINDER_URL);
    expect(email.text).toContain(PROFILE_REMINDER_URL);
    expect(email.text).toContain("message transactionnel");
  });

  it("does not include sales, cross-sell, newsletter or campaign content", () => {
    const email = renderProfileIncompleteReminderEmail({
      email: "awa@example.com",
    });
    const content = `${email.subject} ${email.text}`.toLowerCase();

    expect(content).not.toContain("promotion");
    expect(content).not.toContain("newsletter");
    expect(content).not.toContain("offre");
    expect(content).not.toContain("désabonner");
  });

  it("escapes the recipient name", () => {
    const email = renderProfileIncompleteReminderEmail({
      email: "awa@example.com",
      fullName: "<script>alert(1)</script>",
    });

    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
