"use client";

import { FileCheck2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { DocumentUploader } from "@/components/uploads/document-uploader";
import { DocumentsList } from "@/components/uploads/documents-list";

export default function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DashboardLayout
      title="Coffre documentaire"
      description="Centralisez les pieces justificatives et les attestations generees pour votre dossier AVI CERTIFY."
    >
      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-5">
          <DocumentUploader
            onDocumentUploaded={() => setRefreshKey((value) => value + 1)}
          />

          <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Depot securise</h2>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                  <li>Utilisez un PDF, JPG ou PNG lisible.</li>
                  <li>La taille maximale autorisee est de 5 MB.</li>
                  <li>Evitez les photos floues, coupees ou surexposees.</li>
                  <li>Chaque piece apparait dans votre coffre apres envoi.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-5">
          <DocumentsList refreshKey={refreshKey} />

          <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <FileCheck2 className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Attestations AVI CERTIFY</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Les documents generes, comme l'attestation d'hebergement,
                  restent disponibles ici avec leurs actions de telechargement
                  et de verification.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
