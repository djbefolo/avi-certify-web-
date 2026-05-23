import type { Metadata } from "next";
import { privateRouteMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...privateRouteMetadata,
  title: "Admin fintech | AVI CERTIFY",
  description: "Backoffice privé de pilotage fintech AVI CERTIFY.",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
