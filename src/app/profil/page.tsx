"use client";

import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";

export default function ProfilPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      title="Profil"
      description="Consultez les informations de compte connues localement. La lecture Firestore du profil sera ajoutee plus tard."
    >
      <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
              <UserRound className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Informations utilisateur</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Ces donnees proviennent de Firebase Auth. Le document Firestore
              users/[uid] sera connecte dans une etape suivante pour enrichir
              le profil.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Compte actif
          </span>
        </div>

        <dl className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </dt>
            <dd className="mt-2 break-all font-semibold">
              {user?.email ?? "Non renseigne"}
            </dd>
          </div>
          <div className="rounded-md border bg-muted/25 p-4">
            <dt className="text-sm font-medium text-muted-foreground">
              Identifiant Firebase
            </dt>
            <dd className="mt-2 break-all font-semibold">
              {user?.uid ?? "Non disponible"}
            </dd>
          </div>
        </dl>
      </section>
    </DashboardLayout>
  );
}
