"use client";

import { useEffect, useRef } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileArchive,
  FileText,
  Landmark,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  UsersRound,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AdminNavigationKey = "overview" | "leads" | "clients" | "cases" | "documents" | "payments" | "finance" | "certificates" | "housing" | "notifications" | "audit" | "settings";
type NavigationItemDefinition = { label: string; key: AdminNavigationKey; icon: LucideIcon };
type NavigationGroupDefinition = { group: string; items: readonly NavigationItemDefinition[] };

export const adminNavigation: readonly NavigationGroupDefinition[] = [
  { group: "Pilotage", items: [{ label: "Vue d'ensemble", key: "overview", icon: Landmark }] },
  {
    group: "Commercial",
    items: [
      { label: "Prospects", key: "leads", icon: UserRound },
      { label: "Clients", key: "clients", icon: UsersRound },
    ],
  },
  {
    group: "Opérations",
    items: [
      { label: "Dossiers", key: "cases", icon: BriefcaseBusiness },
      { label: "Documents", key: "documents", icon: FileArchive },
      { label: "Logements", key: "housing", icon: Building2 },
      { label: "Attestations / AVI", key: "certificates", icon: FileText },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Paiements", key: "payments", icon: CreditCard },
      { label: "Finance / Préfinancement", key: "finance", icon: ClipboardCheck },
    ],
  },
  {
    group: "Suivi",
    items: [
      { label: "Notifications", key: "notifications", icon: Bell },
      { label: "Audit", key: "audit", icon: ShieldCheck },
    ],
  },
  { group: "Système", items: [{ label: "Paramètres admin", key: "settings", icon: Settings }] },
];

type AdminSidebarProps = {
  active: AdminNavigationKey;
  collapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onSelect: (key: AdminNavigationKey) => void;
  onToggleCollapsed: () => void;
};

function NavigationItem({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: NavigationItemDefinition;
  active: AdminNavigationKey;
  collapsed?: boolean;
  onSelect: (key: AdminNavigationKey) => void;
}) {
  const Icon = item.icon;
  const isActive = item.key === active;

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-300 ${
        isActive
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      } ${collapsed ? "justify-center px-2" : ""}`}
      onClick={() => onSelect(item.key)}
      title={collapsed ? item.label : undefined}
      type="button"
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-emerald-300"}`} aria-hidden="true" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </button>
  );
}

function NavigationContent({ active, collapsed = false, onSelect }: Pick<AdminSidebarProps, "active" | "onSelect"> & { collapsed?: boolean }) {
  return (
    <nav aria-label="Navigation des opérations" className="space-y-5">
      {adminNavigation.map(({ group, items }) => (
        <div key={group}>
          {!collapsed ? <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group}</p> : null}
          <div className="space-y-1">
            {items.map((item) => <NavigationItem key={item.key} item={item} active={active} collapsed={collapsed} onSelect={onSelect} />)}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({ active, collapsed, isMobileOpen, onCloseMobile, onSelect, onToggleCollapsed }: AdminSidebarProps) {
  const mobileDrawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isMobileOpen) return;

    const drawer = mobileDrawerRef.current;
    const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusableElements = () => Array.from(drawer?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusableElements()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMobile();
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  const selectAndClose = (key: AdminNavigationKey) => {
    onSelect(key);
    onCloseMobile();
  };

  return (
    <>
      <aside className={`hidden min-h-screen shrink-0 border-r border-white/10 bg-[linear-gradient(165deg,#071425_0%,#0b2039_58%,#0b2e35_100%)] text-white transition-[width] duration-200 lg:block ${collapsed ? "w-20" : "w-64"}`}>
        <div className="sticky top-0 flex min-h-screen flex-col px-3 py-5">
          <div className={`mb-8 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
              {!collapsed ? <div className="min-w-0"><p className="truncate text-sm font-bold tracking-[0.08em]">AVI CERTIFY</p><p className="mt-0.5 text-xs text-slate-400">Operations OS</p></div> : null}
            </div>
            {!collapsed ? <button aria-label="Réduire le menu" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" onClick={onToggleCollapsed} type="button"><PanelLeftClose className="h-4 w-4" /></button> : null}
          </div>
          <NavigationContent active={active} collapsed={collapsed} onSelect={onSelect} />
          {collapsed ? <button aria-label="Développer le menu" className="mt-auto rounded-xl p-3 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" onClick={onToggleCollapsed} type="button"><PanelLeftOpen className="mx-auto h-4 w-4" /></button> : <p className="mt-auto px-3 pt-8 text-xs leading-5 text-slate-500">Pilotage sécurisé des opérations AVI CERTIFY.</p>}
        </div>
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation des opérations">
          <button aria-label="Fermer la navigation" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" onClick={onCloseMobile} type="button" />
          <aside ref={mobileDrawerRef} className="relative flex h-full w-[min(20rem,86vw)] flex-col bg-[linear-gradient(165deg,#071425_0%,#0b2039_58%,#0b2e35_100%)] px-4 py-5 text-white shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="mb-8 flex items-center justify-between px-2"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-bold tracking-[0.08em]">AVI CERTIFY</p><p className="text-xs text-slate-400">Operations OS</p></div></div><button aria-label="Fermer le menu" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" onClick={onCloseMobile} type="button"><X className="h-5 w-5" /></button></div>
            <NavigationContent active={active} onSelect={selectAndClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function AdminTopbar({
  active,
  adminEmail,
  adminRole,
  isBusy,
  onLogout,
  onRefresh,
  onOpenMobileNav,
}: {
  active: AdminNavigationKey;
  adminEmail?: string | null;
  adminRole: string;
  isBusy: boolean;
  onLogout: () => void;
  onRefresh: () => void;
  onOpenMobileNav: () => void;
}) {
  const activeItem = adminNavigation.flatMap(({ items }) => items).find((item) => item.key === active);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur-xl">
      <div className="flex min-h-[4.75rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button aria-label="Ouvrir le menu" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden" onClick={onOpenMobileNav} type="button"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Pilotage opérationnel</p><h1 className="truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{activeItem?.label ?? "Administration"}</h1></div>
        <div className="hidden items-center gap-2 sm:flex"><Button type="button" variant="ghost" onClick={onRefresh} disabled={isBusy}>Actualiser</Button><Button type="button" variant="outline" onClick={onLogout} disabled={isBusy}>Fermer session</Button></div>
        <span className="hidden max-w-48 truncate rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 xl:inline-flex">{adminEmail ?? `Admin ${adminRole}`}</span>
      </div>
    </header>
  );
}

export function AdminPageHeader({ title, subtitle, eyebrow }: { title: string; subtitle: string; eyebrow?: string }) {
  return <div className="mb-6"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">{eyebrow ?? "Espace opérations"}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{subtitle}</p></div>;
}
