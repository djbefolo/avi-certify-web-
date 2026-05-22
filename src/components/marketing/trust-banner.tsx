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
    <section className="border-y bg-gradient-to-r from-muted/40 via-accent/5 to-muted/40">
      <div className="container py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
          {trustPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.label}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 shadow-sm">
                  <Icon className="h-6 w-6 text-accent" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {point.label}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
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
