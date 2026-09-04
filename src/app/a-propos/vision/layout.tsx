import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Notre vision | AVI CERTIFY",
  description:
    "La vision d'AVI CERTIFY : devenir la référence de l'accompagnement documentaire et financier pour la mobilité internationale.",
  path: "/a-propos/vision",
});

export default function VisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
