import {
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "Vue globale",
    description: "Synthese du dossier",
    icon: Home,
  },
  {
    href: "/dossier",
    label: "Dossier",
    description: "Suivi et etapes",
    icon: FolderKanban,
  },
  {
    href: "/dossier/documents",
    label: "Documents",
    description: "Pieces attendues",
    icon: FileText,
  },
  {
    href: "/dossier/paiement",
    label: "Paiement",
    description: "Reglement securise",
    icon: CreditCard,
  },
  {
    href: "/profil",
    label: "Profil",
    description: "Informations personnelles",
    icon: UserRound,
  },
];

export function isDashboardNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
