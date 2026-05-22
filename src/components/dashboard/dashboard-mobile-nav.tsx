"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  dashboardNavItems,
  isDashboardNavItemActive,
} from "@/components/dashboard/dashboard-navigation";
import { cn } from "@/lib/utils";

export function DashboardMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-b bg-background px-3 py-2 lg:hidden"
      aria-label="Navigation espace client mobile"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dashboardNavItems.map((item) => {
          const active = isDashboardNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-24 flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium",
                active
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-input bg-background text-muted-foreground hover:bg-muted/60",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
