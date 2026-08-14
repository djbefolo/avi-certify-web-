"use client";

import { AlertCircle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  formatPaymentAmount,
  paymentServiceOptions,
} from "@/constants/payments";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import type { PaymentServiceType } from "@/types/payment";

type CheckoutResponse = {
  checkoutUrl?: string;
  error?: string;
  message?: string;
};

async function parseCheckoutError(response: Response) {
  const payload = (await response.json().catch(() => null)) as CheckoutResponse | null;
  if (payload?.error === "EMAIL_NOT_VERIFIED") {
    return "Verification email requise avant de demarrer un paiement.";
  }
  return payload?.message ?? payload?.error ?? "Paiement indisponible. Veuillez reessayer.";
}

export function PaymentButton() {
  const submitLockRef = useRef(false);
  const { isEmailVerified, user } = useAuth();
  const { trackCheckoutStarted, trackPaymentStarted } = useAnalytics();
  const [serviceType, setServiceType] = useState<PaymentServiceType>("avi_support");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedService = paymentServiceOptions.find(
    (service) => service.type === serviceType,
  );
  const requiresHousingRequest = serviceType === "accommodation_certificate";

  async function startCheckout() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!user) throw new Error("Vous devez etre connecte pour payer.");
      if (!isEmailVerified) {
        throw new Error("Verification email requise avant de demarrer un paiement.");
      }
      if (requiresHousingRequest) {
        submitLockRef.current = false;
        setIsLoading(false);
        window.location.assign("/dossier/logement");
        return;
      }

      trackPaymentStarted(serviceType);
      const token = await user.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceType }),
      });
      if (!response.ok) throw new Error(await parseCheckoutError(response));
      const payload = (await response.json()) as CheckoutResponse;
      if (!payload.checkoutUrl) throw new Error("Stripe n'a pas retourne d'URL de paiement.");
      trackCheckoutStarted(serviceType);
      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Paiement indisponible.",
      );
      submitLockRef.current = false;
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/10">
        <CreditCard className="h-6 w-6 text-accent" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Paiement securise par Stripe</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Choisissez le service a regler avant la redirection vers Stripe Checkout.
      </p>
      <div className="mt-4 rounded-md border border-accent/20 bg-accent/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
          <h3 className="font-semibold">Protection du paiement</h3>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Le montant est determine cote serveur. AVI CERTIFY ne conserve aucune
          donnee de carte bancaire.
        </p>
      </div>

      <div className="mt-5 grid gap-5">
        {errorMessage ? (
          <div role="alert" className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <p>{errorMessage}</p>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="payment-service">Service</Label>
          <Select
            id="payment-service"
            value={serviceType}
            disabled={isLoading}
            onChange={(event) => setServiceType(event.target.value as PaymentServiceType)}
          >
            {paymentServiceOptions.map((service) => (
              <option key={service.type} value={service.type}>
                {service.label} - {formatPaymentAmount(service.amount, service.currency)}
              </option>
            ))}
          </Select>
        </div>
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
                {formatPaymentAmount(selectedService.amount, selectedService.currency)}
              </span>
            </div>
          </div>
        ) : null}
        <Button type="button" size="lg" variant="cta" disabled={isLoading} aria-busy={isLoading} onClick={() => void startCheckout()}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
          {isLoading
            ? "Redirection en cours..."
            : requiresHousingRequest
              ? "Completer la demande logement"
              : "Proceder au paiement securise"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Besoin d&apos;aide ? <a href="mailto:contact@avicertify.fr" className="font-medium text-foreground hover:text-accent">contact@avicertify.fr</a>
        </p>
      </div>
    </section>
  );
}
