import type { Metadata } from "next";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";
import { getCertificateVerificationByToken } from "@/lib/certificates/certificate.service";

type VerificationPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vérification document | AVI CERTIFY",
  description: "Vérifiez l'authenticité d'un document AVI CERTIFY.",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: unknown) {
  if (value instanceof Timestamp) {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
    }).format(value.toDate());
  }

  return "Non disponible";
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Non disponible";
}

function getCertificateStatusLabel(status: unknown) {
  if (status === "generated") {
    return "Document actif";
  }

  if (status === "revoked") {
    return "Document révoqué";
  }

  return "Document invalide";
}

export default async function VerificationPage({ params }: VerificationPageProps) {
  const { token } = await params;
  const certificate = await getCertificateVerificationByToken(token);
  const data = certificate?.data;
  const activeData = data?.status === "generated" ? data : null;
  const isAuthentic = Boolean(activeData);
  const statusLabel = getCertificateStatusLabel(data?.status);

  return (
    <main className="container flex min-h-[70vh] items-center justify-center py-12">
      <section className="w-full max-w-2xl rounded-md border bg-background p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4">
          <span
            className={
              isAuthentic
                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive"
            }
          >
            {isAuthentic ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-6 w-6" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Vérification AVI CERTIFY
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {isAuthentic ? "Document authentique" : "Document invalide"}
            </h1>
            <p className="mt-3 leading-7 text-muted-foreground">
              {isAuthentic
                ? "Ce document correspond à une attestation générée par AVI CERTIFY."
                : statusLabel}
            </p>
          </div>
        </div>

        {isAuthentic ? (
          <dl className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-muted/25 p-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Étudiant
              </dt>
              <dd className="mt-2 font-semibold">
                {getString(activeData?.studentFullName)}
              </dd>
            </div>
            <div className="rounded-md border bg-muted/25 p-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Type de certificat
              </dt>
              <dd className="mt-2 font-semibold">
                Attestation d'hébergement
              </dd>
            </div>
            <div className="rounded-md border bg-muted/25 p-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Numéro
              </dt>
              <dd className="mt-2 break-all font-semibold">
                {getString(activeData?.certificateNumber)}
              </dd>
            </div>
            <div className="rounded-md border bg-muted/25 p-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Date d'émission
              </dt>
              <dd className="mt-2 font-semibold">
                {formatDate(activeData?.createdAt)}
              </dd>
            </div>
            <div className="rounded-md border bg-muted/25 p-4">
              <dt className="text-sm font-medium text-muted-foreground">
                Statut
              </dt>
              <dd className="mt-2 font-semibold">{statusLabel}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </main>
  );
}
