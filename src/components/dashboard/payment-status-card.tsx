import { CreditCard } from "lucide-react";
import type { ApplicationPayment } from "@/types/application";
import { getPaymentStatusLabel, getStatusClassName } from "@/components/dashboard/status-styles";
import { cn } from "@/lib/utils";

type PaymentStatusCardProps = {
  payment: ApplicationPayment;
};

export function PaymentStatusCard({ payment }: PaymentStatusCardProps) {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Paiement securise</p>
          <h2 className="mt-2 text-xl font-semibold">{payment.amountLabel}</h2>
        </div>
        <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <p className="mt-4 leading-7 text-muted-foreground">{payment.description}</p>

      <span
        className={cn(
          "mt-5 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold",
          getStatusClassName(payment.status),
        )}
      >
        {getPaymentStatusLabel(payment.status)}
      </span>
    </article>
  );
}
