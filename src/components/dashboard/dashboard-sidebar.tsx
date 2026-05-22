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
    <aside className="hidden min-h-screen w-72 shrink-0 border-r bg-background/95 lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              AVI
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide">
                AVI CERTIFY
              </span>
              <span className="block text-xs text-muted-foreground">
                Mobilite internationale
              </span>
            </span>
          </Link>
          <div className="mt-5 flex items-center gap-2 rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Espace client securise
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
                  "grid grid-cols-[2.5rem_1fr] items-center rounded-md border border-transparent px-3 py-3 text-sm transition-colors",
                  active
                    ? "border-primary/15 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    active ? "bg-background text-primary" : "bg-muted/60",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      active ? "text-primary/75" : "text-muted-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t p-5">
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Acces protege pour vos documents, paiements et attestations AVI CERTIFY.
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
