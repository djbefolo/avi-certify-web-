import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Confiance et conformité | AVI CERTIFY",
  description:
    "Clarté, conformité réglementaire et protection des données : les piliers de la confiance AVI CERTIFY (RCS, ORIAS, RGPD).",
  path: "/a-propos/confiance",
});

export default function ConfianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
