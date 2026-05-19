import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Connexion espace client",
  description:
    "Connectez-vous à votre espace AVI CERTIFY pour suivre votre dossier étudiant, vos documents et vos prochaines étapes.",
  path: "/connexion",
});

export default function SignInPage() {
  return (
    <>
      <PageHeader
        eyebrow="Espace client"
        title="Connexion à votre dossier AVI CERTIFY."
        description="Accédez à votre espace sécurisé pour suivre votre dossier, vos documents et les prochaines étapes."
      />
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold">Accès sécurisé</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Connectez-vous avec l'adresse email utilisée pour votre dossier AVI
            CERTIFY. Les informations sensibles restent protégées et accessibles
            uniquement depuis votre espace.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Nouveau sur AVI CERTIFY ?{" "}
            <Link href="/inscription" className="font-medium text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <div className="w-full max-w-xl rounded-md border bg-background p-5 shadow-sm md:p-6">
          <LoginForm />
        </div>
      </section>
    </>
  );
}
