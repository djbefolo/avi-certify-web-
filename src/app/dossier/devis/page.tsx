"use client";

import { ClientQuotesList } from "@/components/dashboard/client-quotes-list";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function ClientQuotesPage() {
  return (
    <DashboardLayout
      title="Mes devis"
      description="Consultez les devis AVI CERTIFY générés pour votre dossier."
    >
      <ClientQuotesList />
    </DashboardLayout>
  );
}
