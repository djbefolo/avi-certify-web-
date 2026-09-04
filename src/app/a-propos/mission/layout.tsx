import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Notre mission | AVI CERTIFY",
  description:
    "La mission d'AVI CERTIFY : simplifier les démarches administratives et financières des étudiants en mobilité internationale.",
  path: "/a-propos/mission",
});

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
