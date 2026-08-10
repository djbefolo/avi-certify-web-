"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { FloatingGuideCta } from "@/components/guide/floating-guide-cta";
import { FloatingCta } from "@/components/navigation/floating-cta";

type SiteShellProps = {
  children: React.ReactNode;
};

const privateRoutePrefixes = ["/admin", "/dashboard", "/dossier", "/profil"];

function isPrivateRoute(pathname: string) {
  return privateRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const privateRoute = isPrivateRoute(pathname);

  if (privateRoute) {
    return <main className="min-h-screen bg-muted/30">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingGuideCta />
      <FloatingCta />
    </div>
  );
}
