import { LeadForm } from "@/components/forms/lead-form";
import { SectionHeading } from "@/components/marketing/section-heading";

export function LeadFormSection() {
  return (
    <section className="border-t border-slate-200 bg-[#FCFAF5]">
      <div className="container grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:items-start md:py-24">
        <SectionHeading
          eyebrow="Démarrer"
          title="Recevez un accompagnement adapté à votre projet."
          description="Renseignez les informations essentielles pour qualifier votre besoin et préparer la prochaine étape de votre dossier."
        />
        <div className="rounded-md border border-[#07142B]/15 bg-white p-5 md:p-6">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
