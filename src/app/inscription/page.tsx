import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Créer un compte AVI CERTIFY",
  description:
    "Créez votre compte AVI CERTIFY pour initialiser un espace client sécurisé et suivre votre dossier étudiant.",
  path: "/inscription",
});

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="Inscription"
        title="Créez votre compte AVI CERTIFY."
        description="Initialisez votre espace client sécurisé pour préparer et suivre votre dossier étudiant."
      />
      <section className="container grid gap-8 py-12 lg:grid-cols-[0.82fr_1.18fr] lg:py-16">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold">Votre espace personnel</h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Le compte permet d'associer vos informations à un profil sécurisé.
            Les rôles, statuts et accès sensibles sont attribués côté serveur.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <div className="w-full max-w-xl rounded-md border bg-background p-5 shadow-sm md:p-6">
          <RegisterForm />
        </div>
      </section>
    </>
  );
}
