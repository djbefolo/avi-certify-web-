import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Mentions légales",
  description: "Informations légales de la société AVI CERTIFY.",
  path: "/mentions-legales",
});

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Légal"
        title="Mentions légales"
        description="Informations légales de la société AVI CERTIFY."
      />
      <section className="container py-12 lg:py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Document légal officiel
          </span>
        </div>
        <p className="mb-8 text-sm text-muted-foreground">
          Dernière mise à jour: 22 mai 2026 • RCS 942 370 545
        </p>
        <div className="prose prose-sm max-w-3xl">
          <h2>Identification de la société</h2>
          <p>
            <strong>Dénomination sociale :</strong> AVI CERTIFY
          </p>
          <p>
            <strong>Forme juridique :</strong> SAS au capital social de 10 000 €
          </p>
          <p>
            <strong>Siège social :</strong> 75 Rue de Besançon, 25300
            Pontarlier, France
          </p>
          <p>
            <strong>RCS :</strong> Besançon 942 370 545
          </p>
          <p>
            <strong>ORIAS :</strong> 25005516
          </p>

          <h2>Contact</h2>
          <p>
            <strong>Email :</strong>{" "}
            <a href="mailto:contact@avicertify.fr">contact@avicertify.fr</a>
          </p>

          <h2>Hébergement</h2>
          <p>
            Ce site est hébergé conformément aux réglementations en vigueur.
            Les informations d'hébergement sont disponibles sur demande.
          </p>

          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble du contenu présent sur ce site (textes, images, logos,
            graphiques) est la propriété exclusive d'AVI CERTIFY, sauf mention
            contraire. Toute reproduction, distribution ou utilisation sans
            autorisation préalable est interdite.
          </p>

          <h2>Données personnelles</h2>
          <p>
            Pour toute information concernant le traitement de vos données
            personnelles, veuillez consulter notre{" "}
            <a href="/confidentialite">politique de confidentialité</a>.
          </p>
        </div>
      </section>
    </>
  );
}
