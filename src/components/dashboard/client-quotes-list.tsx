"use client";

import { FileText, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { ClientQuoteView } from "@/types/fintech";

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  GENERATED: "Généré",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  EXPIRED: "Expiré",
  draft: "Brouillon",
  pending_admin_validation: "Validation admin",
  validated: "Validé",
};

function money(value: number | undefined, currency?: string) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)}${currency ? ` ${currency}` : ""}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "À confirmer" : date.toLocaleDateString("fr-FR");
}

export function ClientQuotesList() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<ClientQuoteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/client/quotes", {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Impossible de charger les devis.");

      const data = (await response.json()) as { quotes: ClientQuoteView[] };
      setQuotes(data.quotes);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function downloadQuote(quote: ClientQuoteView) {
    if (!user) return;

    const token = await user.getIdToken();
    const response = await fetch(`/api/client/quotes/${quote.id}/download`, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setError("Le PDF du devis n'est pas encore disponible.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mes devis / simulations</p>
          <h2 className="mt-2 text-xl font-semibold">Devis AVI CERTIFY</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des devis...
        </p>
      ) : null}

      {!loading && !quotes.length ? (
        <div className="mt-6 rounded-md border bg-muted/25 p-5 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Aucun devis disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les devis générés par AVI CERTIFY apparaîtront ici.
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {quotes.map((quote) => (
          <article key={quote.id} className="rounded-md border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold">{quote.title ?? `Devis AVI CERTIFY ${quote.id}`}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quote.simulation.region === "canada" ? "Canada" : "Europe / France"} -{" "}
                  {quote.simulation.option} - {statusLabels[quote.status] ?? quote.status}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Montant: {money(quote.simulation.targetAmount, quote.simulation.targetCurrency)}
                  {" · "}
                  Validité: {formatDate(quote.validUntil ?? quote.expiresAt)}
                  {" · "}
                  Envoyé le: {formatDate(quote.sentAt)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ce devis reste soumis à validation documentaire et administrative AVI CERTIFY.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!quote.pdfAvailable}
                onClick={() => void downloadQuote(quote)}
              >
                Télécharger
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
