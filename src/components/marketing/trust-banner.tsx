import { ShieldCheck, FileCheck2, Building2, Lock } from "lucide-react";

const trustPoints = [
  {
    icon: Building2,
    label: "Société immatriculée",
    sublabel: "RCS 942 370 545 • ORIAS 25005516",
  },
  {
    icon: FileCheck2,
    label: "Attestations vérifiables",
    sublabel: "Documents certifiés et traçables",
  },
  {
    icon: Lock,
    label: "Paiement sécurisé",
    sublabel: "Protection Stripe • PCI-DSS",
  },
  {
    icon: ShieldCheck,
    label: "Espace client protégé",
    sublabel: "Accès authentifié et chiffré",
  },
];

export function TrustBanner() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="container py-9 sm:py-10">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#07142B]/10 border border-[#07142B]/10 md:grid-cols-4 md:divide-y-0">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.label}
                className="flex min-h-36 flex-col justify-center p-5 text-left sm:p-6"
              >
                <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <p className="mt-5 text-sm font-semibold text-[#07142B]">
                  {point.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {point.sublabel}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
