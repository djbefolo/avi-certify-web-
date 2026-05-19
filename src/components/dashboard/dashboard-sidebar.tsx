"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  dashboardNavItems,
  isDashboardNavItemActive,
} from "@/components/dashboard/dashboard-navigation";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r bg-background lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b p-5">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              AVI
            </span>
            <span>AVI CERTIFY</span>
          </Link>
          <div className="mt-5 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            Espace client securise
          </div>
        </div>

        <nav className="grid gap-1 p-3" aria-label="Navigation espace client">
          {dashboardNavItems.map((item) => {
            const active = isDashboardNavItemActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid grid-cols-[2.5rem_1fr] items-center rounded-md px-3 py-3 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-background/10">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      active ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t p-5 text-xs leading-5 text-muted-foreground">
          Les donnees affichees sont des apercus. La synchronisation Firestore
          metier sera connectee dans une etape suivante.
        </div>
      </div>
    </aside>
  );
}
