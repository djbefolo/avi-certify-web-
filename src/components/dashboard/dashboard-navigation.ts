import {
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  UserRound,
  Building2,
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
    description: "Centre de controle",
    icon: Home,
  },
  {
    href: "/dossier",
    label: "Dossier",
    description: "Parcours et etapes",
    icon: FolderKanban,
  },
  {
    href: "/dossier/documents",
    label: "Pieces",
    description: "Coffre documentaire",
    icon: FileText,
  },
  {
    href: "/dossier/logement",
    label: "Logement",
    description: "Attestation conditionnelle",
    icon: Building2,
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
    description: "Identite client",
    icon: UserRound,
  },
];

export function isDashboardNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}
