"use client";

import { CheckCircle2, ExternalLink, Loader2, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { PaymentStatusCard } from "@/components/dashboard/payment-status-card";
import { PaymentButton } from "@/components/payments/payment-button";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";
import { getGeneratedCertificateDocument } from "@/lib/documents/document.service";
import { getUserDocumentDownloadUrl } from "@/lib/firebase/storage";
import type { UserDocument } from "@/types/document";

export default function PaiementPage() {
  const { summary, loading, errorMessage } = useDashboardSummary();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<UserDocument | null>(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [openingCertificate, setOpeningCertificate] = useState(false);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const hasPaidPayment = summary.payment.status === "paid";

  useEffect(() => {
    let cancelled = false;

    async function loadCertificate() {
      if (!user || !hasPaidPayment || !summary.payment.id) {
        setCertificate(null);
        setCertificateLoading(false);
        return;
      }

      setCertificateLoading(true);
      setCertificateError(null);

      try {
        const nextCertificate = await getGeneratedCertificateDocument(
          user.uid,
          summary.payment.id,
        );

        if (!cancelled) {
          setCertificate(nextCertificate);
        }
      } catch {
        if (!cancelled) {
          setCertificateError(
            "Impossible de charger l'attestation pour le moment.",
          );
          setCertificate(null);
        }
      } finally {
        if (!cancelled) {
          setCertificateLoading(false);
        }
      }
    }

    void loadCertificate();

    return () => {
      cancelled = true;
    };
  }, [hasPaidPayment, summary.payment.id, user]);

  const openCertificate = async () => {
    if (!certificate) {
      return;
    }

    setOpeningCertificate(true);
    setCertificateError(null);

    try {
      const url = await getUserDocumentDownloadUrl(certificate.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setCertificateError("Impossible d'ouvrir l'attestation pour le moment.");
    } finally {
      setOpeningCertificate(false);
    }
  };

  return (
    <DashboardLayout
      title="Paiement sécurisé"
      description="Suivez votre règlement AVI CERTIFY et récupérez votre attestation lorsqu'elle est disponible."
    >
      {errorMessage ? (
        <p className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {loading ? (
        <p className="mb-5 rounded-md border bg-muted/25 p-3 text-sm text-muted-foreground">
          Chargement du paiement...
        </p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-5">
          <PaymentStatusCard payment={summary.payment} />

          <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <ReceiptText className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Suivi financier</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Votre statut de paiement est synchronisé automatiquement après
                  confirmation par Stripe Checkout.
                </p>
              </div>
            </div>
          </section>
        </div>

        {certificate ? (
          <section className="rounded-md border border-accent/25 bg-accent/5 p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">Attestation générée</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Votre attestation d'hébergement est disponible.
                </p>
                {certificateError ? (
                  <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {certificateError}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={openingCertificate}
                    onClick={() => void openCertificate()}
                  >
                    {openingCertificate ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    )}
                    Télécharger l'attestation
                  </Button>
                  {certificate.verificationUrl ? (
                    <Button variant="outline" asChild>
                      <Link
                        href={certificate.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Vérifier l'authenticité
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : certificateLoading ? (
          <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm md:p-6">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement de l'attestation...
          </section>
        ) : hasPaidPayment ? (
          <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10">
                <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">Paiement confirmé</h2>
                <p className="mt-3 leading-7 text-muted-foreground">
                  Votre paiement est confirmé. L'attestation est en cours de
                  génération.
                </p>
                {certificateError ? (
                  <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {certificateError}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <PaymentButton />
        )}
      </div>
    </DashboardLayout>
  );
}
