import { Mail, MessageCircle, Phone } from "lucide-react";
import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Contact conseiller AVI étudiant",
  description:
    "Contactez AVI CERTIFY pour qualifier votre besoin en AVI étudiant, attestation d'hébergement, préfinancement ou accompagnement visa.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Parlez à un conseiller AVI CERTIFY."
        description="Laissez vos coordonnées ou contactez l'équipe pour qualifier votre besoin et démarrer votre dossier."
      />
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:py-16">
        <div className="grid gap-4 self-start">
          {[
            { icon: MessageCircle, title: "WhatsApp", value: "À renseigner" },
            { icon: Mail, title: "Email", value: "contact@avicertify.com" },
            { icon: Phone, title: "Téléphone", value: "À renseigner" },
          ].map((item) => (
            <div key={item.title} className="rounded-md border p-5">
              <item.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
              <p className="mt-2 text-muted-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-md border bg-background p-5 shadow-sm md:p-6">
          <LeadForm />
        </div>
      </section>
    </>
  );
}
