import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Mot de passe oublié",
  description:
    "Demandez un lien de réinitialisation pour retrouver l'accès à votre espace client AVI CERTIFY.",
  path: "/mot-de-passe-oublie",
});

export default function ForgotPasswordPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mot de passe"
        title="Réinitialisez votre accès."
        description="Recevez un lien sécurisé pour choisir un nouveau mot de passe et retrouver votre espace AVI CERTIFY."
      />
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold">Lien de réinitialisation</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Saisissez l'adresse email de votre compte. Si elle correspond à un
            utilisateur existant, Firebase Auth enverra les instructions de
            réinitialisation.
          </p>
        </div>

        <div className="w-full max-w-xl rounded-md border bg-background p-5 shadow-sm md:p-6">
          <ForgotPasswordForm />
        </div>
      </section>
    </>
  );
}
