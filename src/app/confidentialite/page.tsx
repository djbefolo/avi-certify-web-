import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité et protection des données personnelles.",
  path: "/confidentialite",
});

export default function ConfidentialitePage() {
  return (
    <>
      <PageHeader
        eyebrow="Confidentialité"
        title="Politique de confidentialité"
        description="Protection de vos données personnelles."
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
          <h2>Introduction</h2>
          <p>
            AVI CERTIFY s'engage à protéger la confidentialité et la sécurité
            de vos données personnelles. Cette politique décrit comment nous
            collectons, utilisons et protégeons vos informations conformément
            au Règlement Général sur la Protection des Données (RGPD).
          </p>

          <h2>Données collectées</h2>
          <p>Nous collectons les informations suivantes :</p>
          <ul>
            <li>Informations d'identification (nom, prénom, email)</li>
            <li>Documents justificatifs nécessaires à votre dossier</li>
            <li>
              Informations de paiement (traitées de manière sécurisée par
              Stripe)
            </li>
          </ul>

          <h2>Utilisation des données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Traiter votre demande de service</li>
            <li>Générer les attestations et documents demandés</li>
            <li>Assurer le suivi de votre dossier</li>
            <li>Vous contacter concernant votre dossier</li>
          </ul>

          <h2>Sécurité des données</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité techniques et
            organisationnelles appropriées pour protéger vos données contre
            tout accès non autorisé, perte ou divulgation.
          </p>

          <h2>Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité des données</li>
            <li>Droit d'opposition</li>
          </ul>

          <h2>Contact</h2>
          <p>
            Pour exercer vos droits ou pour toute question concernant vos
            données personnelles, contactez-nous à :{" "}
            <a href="mailto:contact@avicertify.fr">contact@avicertify.fr</a>
          </p>
        </div>
      </section>
    </>
  );
}
