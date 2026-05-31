"use client";

import { useState } from "react";
import { AlertCircle, Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GuideResourceCardProps = {
  highlighted?: boolean;
};

type DownloadStatus =
  | { state: "idle" }
  | { state: "downloading" }
  | { state: "error"; message: string };

function getDownloadErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Téléchargement impossible pour le moment.";
}

function downloadBlob(blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "AVI_CERTIFY_Guide_2026_Installation_France.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function GuideResourceCard({ highlighted = false }: GuideResourceCardProps) {
  const [status, setStatus] = useState<DownloadStatus>({ state: "idle" });

  const handleDownload = async () => {
    setStatus({ state: "downloading" });

    try {
      const token = await getFirebaseAuth().currentUser?.getIdToken();

      if (!token) {
        throw new Error("Connectez-vous pour télécharger le guide.");
      }

      const response = await fetch("/api/client/resources/guide-france-2026", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Vérifiez votre email avant de télécharger le guide."
            : "Le guide n'a pas pu être téléchargé.",
        );
      }

      downloadBlob(await response.blob());
      setStatus({ state: "idle" });
    } catch (error) {
      setStatus({ state: "error", message: getDownloadErrorMessage(error) });
    }
  };

  return (
    <article
      className={cn(
        "rounded-md border bg-background p-5 shadow-sm md:p-6",
        highlighted && "border-accent/40 bg-accent/5 shadow-md",
      )}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent/10">
            <FileText className="h-5 w-5 text-accent" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                Ressource sécurisée
              </p>
              {highlighted ? (
                <span className="inline-flex items-center rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                  Votre guide est prêt
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold">
              Guide 2026 – Réussir son installation en France
            </h2>
            <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
              Préparez votre arrivée : démarches administratives, logement,
              santé, banque, budget, transport et erreurs fréquentes à éviter.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Téléchargement depuis votre espace AVI CERTIFY sécurisé.
            </p>
          </div>
        </div>

        <Button
          type="button"
          className="shrink-0"
          variant={highlighted ? "cta" : "default"}
          disabled={status.state === "downloading"}
          aria-busy={status.state === "downloading"}
          onClick={handleDownload}
        >
          {status.state === "downloading" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-4 w-4" aria-hidden="true" />
          )}
          {status.state === "downloading"
            ? "Téléchargement..."
            : highlighted
              ? "Télécharger maintenant"
              : "Télécharger le guide"}
        </Button>
      </div>

      {status.state === "error" ? (
        <p
          className="mt-4 flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {status.message}
        </p>
      ) : null}
    </article>
  );
}

