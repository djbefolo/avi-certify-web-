import type { Metadata } from "next";
import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";

export const metadata: Metadata = {
  title: "Verification email requise | AVI CERTIFY",
  description:
    "Confirmez votre adresse email avant d'acceder a votre espace AVI CERTIFY.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EmailVerificationPage() {
  return <EmailVerificationPanel />;
}
