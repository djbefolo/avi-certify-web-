import { beforeEach, describe, expect, it, vi } from "vitest";

const emailMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@/constants/email", () => ({
  getEmailConfig: () => ({
    adminEmail: "admin@example.com",
    fromEmail: "AVI CERTIFY <contact@example.com>",
    replyTo: "support@example.com",
  }),
}));

vi.mock("@/lib/email/resend.client", () => ({
  getResendClient: () => ({ emails: { send: emailMocks.send } }),
}));

import {
  sendProfileReminderEmailWithResult,
  sendWelcomeEmailWithResult,
} from "@/lib/server/email.service";

beforeEach(() => {
  emailMocks.send.mockReset();
});

describe("welcome email delivery", () => {
  it("passes the stable UID-scoped idempotency key to Resend", async () => {
    emailMocks.send.mockResolvedValue({
      data: { id: "resend-1" },
      error: null,
    });

    const result = await sendWelcomeEmailWithResult(
      { email: "awa@example.com", fullName: "Awa Ndiaye" },
      "auth_welcome:user-1",
    );

    expect(result).toMatchObject({
      sent: true,
      messageId: "resend-1",
      status: "SENT",
    });
    expect(emailMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "awa@example.com",
        subject: "Bienvenue dans votre espace AVI CERTIFY",
      }),
      { idempotencyKey: "auth_welcome:user-1" },
    );
  });

  it("passes the stable profile reminder key to Resend", async () => {
    emailMocks.send.mockResolvedValue({
      data: { id: "resend-reminder-1" },
      error: null,
    });

    const result = await sendProfileReminderEmailWithResult(
      { email: "awa@example.com", fullName: "Awa Ndiaye" },
      "onboarding_profile_reminder:user-1:24h",
    );

    expect(result).toMatchObject({
      sent: true,
      messageId: "resend-reminder-1",
      status: "SENT",
    });
    expect(emailMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "awa@example.com",
        subject: "Complétez votre profil AVI CERTIFY",
      }),
      { idempotencyKey: "onboarding_profile_reminder:user-1:24h" },
    );
  });
});
