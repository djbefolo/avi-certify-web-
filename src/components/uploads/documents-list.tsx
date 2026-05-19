"use client";

import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { listUserDocuments } from "@/lib/documents/document.service";
import { getUserDocumentDownloadUrl } from "@/lib/firebase/storage";
import { documentTypeLabels } from "@/lib/validations/document";
import type { DocumentStatus, UserDocument } from "@/types/document";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DocumentsListProps = {
  refreshKey?: number;
};

const statusLabels: Record<DocumentStatus, string> = {
  pending: "En attente",
  uploaded: "Envoye",
  under_review: "En analyse",
  validated: "Valide",
  rejected: "A corriger",
};

function getStatusClassName(status: DocumentStatus) {
  if (status === "validated") {
    return "border-accent/30 bg-accent/10 text-accent";
  }

  if (status === "rejected") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (status === "under_review") {
    return "border-primary/30 bg-primary/10 text-primary";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}

function getFileSizeLabel(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getDateLabel(date: Date | null) {
  if (!date) {
    return "Date en cours de synchronisation";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DocumentsList({ refreshKey = 0 }: DocumentsListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      setDocuments(await listUserDocuments(user.uid));
    } catch {
      setErrorMessage("Impossible de charger les documents pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments, refreshKey]);

  const openDocument = async (document: UserDocument) => {
    setOpeningId(document.id);
    setErrorMessage(null);

    try {
      const url = await getUserDocumentDownloadUrl(document.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setErrorMessage("Impossible d'ouvrir ce document pour le moment.");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Documents envoyes
          </p>
          <h2 className="mt-2 text-xl font-semibold">Pieces de votre dossier</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={loadDocuments}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </Button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 flex items-center gap-3 rounded-md border bg-muted/25 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement des documents...
        </div>
      ) : null}

      {!loading && documents.length === 0 ? (
        <div className="mt-6 rounded-md border bg-muted/25 p-5 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Aucun document envoye</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vos fichiers apparaitront ici apres le premier upload.
          </p>
        </div>
      ) : null}

      {!loading && documents.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {documents.map((document) => (
            <article key={document.id} className="rounded-md border bg-muted/20 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {documentTypeLabels[document.documentType]}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                        getStatusClassName(document.status),
                      )}
                    >
                      {statusLabels[document.status]}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-sm text-muted-foreground">
                    {document.originalFileName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getFileSizeLabel(document.size)} - {getDateLabel(document.createdAt)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={openingId === document.id}
                  onClick={() => void openDocument(document)}
                >
                  {openingId === document.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  )}
                  Ouvrir
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
