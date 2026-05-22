"use client";

import { AlertCircle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import {
  formatPaymentAmount,
  paymentServiceOptions,
} from "@/constants/payments";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import {
  housingRegions,
  type HousingRegionCode,
} from "@/lib/housing/housing-regions";
import type { PaymentServiceType } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
  message?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible de démarrer le paiement pour le moment.";
}

async function parseCheckoutError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | CheckoutResponse
    | null;

  if (payload?.error === "EMAIL_NOT_VERIFIED") {
    return "Vérification email requise. Veuillez confirmer votre adresse email avant de démarrer un paiement.";
  }

  return (
    payload?.message ??
    payload?.error ??
    "Impossible de démarrer le paiement pour le moment. Veuillez réessayer."
  );
}

export function PaymentButton() {
  const submitLockRef = useRef(false);
  const { isEmailVerified, user } = useAuth();
  const { trackCheckoutStarted, trackPaymentStarted } = useAnalytics();
  const [serviceType, setServiceType] = useState<PaymentServiceType>(
    "avi_support",
  );
  const [housingRegion, setHousingRegion] = useState<HousingRegionCode | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedService = paymentServiceOptions.find(
    (service) => service.type === serviceType,
  );
  const requiresHousingRegion = serviceType === "accommodation_certificate";

  const startCheckout = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!user) {
        throw new Error("Vous devez être connecté pour payer.");
      }

      if (!isEmailVerified) {
        throw new Error(
          "Vérification email requise. Veuillez confirmer votre adresse email avant de démarrer un paiement.",
        );
      }

      if (requiresHousingRegion && !housingRegion) {
        throw new Error(
          "Sélectionnez une région académique pour l'attestation d'hébergement.",
        );
      }

      trackPaymentStarted(serviceType);
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceType,
          ...(requiresHousingRegion ? { housingRegion } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseCheckoutError(response));
      }

      const payload = (await response.json()) as CheckoutResponse;

      if (!payload.checkoutUrl) {
        throw new Error("Stripe n'a pas retourné d'URL de paiement.");
      }

      trackCheckoutStarted(serviceType);
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      submitLockRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
        <CreditCard className="h-6 w-6 text-accent" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Paiement sécurisé par Stripe</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Choisissez le service à régler avant d'être redirigé vers Stripe
        Checkout.
      </p>
      <div className="mt-4 rounded-lg border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="font-semibold text-foreground">
            Protection bancaire
          </h3>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <p>Cryptage bancaire certifié PCI-DSS niveau 3</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <p>Aucune donnée bancaire conservée par AVI CERTIFY</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <p>
              Attestation générée et disponible dans votre espace documents
              sous 24-48h ouvrées
            </p>
          </div>
        </div>
        <p className="mt-4 border-t border-accent/20 pt-4 text-xs text-muted-foreground">
          En cas d'anomalie après paiement, notre support vérifie votre dossier
          et vous accompagne dans la résolution.
        </p>
      </div>

      <div className="mt-5 grid gap-5">
        {errorMessage ? (
          <div
            className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p>{errorMessage}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="payment-service">Service</Label>
          <Select
            id="payment-service"
            value={serviceType}
            disabled={isLoading}
            onChange={(event) => {
              const nextServiceType = event.target.value as PaymentServiceType;

              setServiceType(nextServiceType);
              if (nextServiceType !== "accommodation_certificate") {
                setHousingRegion("");
              }
            }}
          >
            {paymentServiceOptions.map((service) => (
              <option key={service.type} value={service.type}>
                {service.label} -{" "}
                {formatPaymentAmount(service.amount, service.currency)}
              </option>
            ))}
          </Select>
        </div>

        {requiresHousingRegion ? (
          <div className="grid gap-2">
            <Label htmlFor="housing-region">Région académique</Label>
            <Select
              id="housing-region"
              value={housingRegion}
              required
              disabled={isLoading}
              onChange={(event) =>
                setHousingRegion(event.target.value as HousingRegionCode)
              }
            >
              <option value="">Sélectionner une région</option>
              {housingRegions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {selectedService ? (
          <div className="rounded-md border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{selectedService.label}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {selectedService.description}
                </p>
              </div>
              <span className="shrink-0 rounded-md border bg-background px-2.5 py-1 text-sm font-semibold">
                {formatPaymentAmount(
                  selectedService.amount,
                  selectedService.currency,
                )}
              </span>
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          variant="cta"
          disabled={isLoading}
          aria-busy={isLoading}
          onClick={startCheckout}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCard className="h-4 w-4" aria-hidden="true" />
          )}
          {isLoading ? "Redirection en cours..." : "Procéder au paiement sécurisé"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Besoin d'aide ? Contactez-nous à{" "}
          <a
            href="mailto:contact@avicertify.com"
            className="font-medium text-foreground transition-colors hover:text-accent"
          >
            contact@avicertify.com
          </a>
        </p>
      </div>
    </section>
  );
}
