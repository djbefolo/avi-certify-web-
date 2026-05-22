"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import {
  dashboardNavItems,
  isDashboardNavItemActive,
} from "@/components/dashboard/dashboard-navigation";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r bg-gradient-to-b from-primary to-primary-dark lg:block">
      <div className="sticky top-0 flex h-screen flex-col text-white">
        <div className="border-b border-white/10 px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-sm font-bold text-white shadow-lg">
              AVI
            </span>
            <span>
              <span className="block text-sm font-bold tracking-wide text-white">
                AVI CERTIFY
              </span>
              <span className="block text-xs text-gray-300">
                Espace client sécurisé
              </span>
            </span>
          </Link>
          <div className="mt-4 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-light">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Accès protégé et authentifié
          </div>
        </div>

        <nav className="grid gap-1.5 p-3" aria-label="Navigation espace client">
          {dashboardNavItems.map((item) => {
            const active = isDashboardNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr] items-center rounded-md border px-3 py-3 text-sm transition-all duration-200",
                  active
                    ? "border-accent/30 bg-white/10 text-white shadow-sm"
                    : "border-transparent text-gray-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    active
                      ? "bg-accent/20 text-accent-light"
                      : "bg-white/5 text-gray-400",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      active ? "text-gray-200" : "text-gray-400",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 p-5">
          <div className="flex items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-gray-300">
            <LockKeyhole
              className="mt-0.5 h-4 w-4 shrink-0 text-accent-light"
              aria-hidden="true"
            />
            <span>
              Accès protégé pour vos documents, paiements et attestations AVI
              CERTIFY.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
