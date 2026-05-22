import { PageHeader } from "@/components/marketing/page-header";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata = createPageMetadata({
  title: "Conditions générales de vente",
  description: "Conditions générales de vente des services AVI CERTIFY.",
  path: "/cgv",
});

export default function CgvPage() {
  return (
    <>
      <PageHeader
        eyebrow="Légal"
        title="Conditions générales de vente"
        description="Conditions applicables à nos services."
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
          <h2>1. Objet</h2>
          <p>
            Les présentes conditions générales de vente régissent les
            prestations de services proposées par AVI CERTIFY aux étudiants
            souhaitant bénéficier d'un accompagnement pour leurs démarches de
            mobilité internationale.
          </p>

          <h2>2. Services proposés</h2>
          <p>AVI CERTIFY propose les services suivants :</p>
          <ul>
            <li>
              Préparation et accompagnement pour l'attestation de virement
              irrévocable (AVI)
            </li>
            <li>Génération d'attestation d'hébergement</li>
            <li>Accompagnement pour le préfinancement étudiant</li>
            <li>Assistance pour les démarches visa</li>
          </ul>

          <h2>3. Tarifs</h2>
          <p>
            Les tarifs des services sont indiqués en euros (EUR) et incluent
            toutes les taxes applicables. Les prix sont consultables sur notre
            site et peuvent être modifiés à tout moment, sous réserve de ne pas
            affecter les commandes en cours.
          </p>

          <h2>4. Paiement</h2>
          <p>
            Le paiement s'effectue en ligne via notre prestataire sécurisé
            Stripe. Le paiement doit être effectué avant la génération des
            documents. AVI CERTIFY ne stocke aucune information bancaire.
          </p>

          <h2>5. Délais de livraison</h2>
          <p>
            Les attestations et documents sont générés dans un délai de 24 à 48
            heures ouvrées après validation du paiement et réception de
            l'ensemble des documents requis.
          </p>

          <h2>6. Droit de rétractation</h2>
          <p>
            Conformément à la réglementation en vigueur, vous disposez d'un
            droit de rétractation de 14 jours à compter de la validation de
            votre commande, avant la génération des documents.
          </p>

          <h2>7. Responsabilité</h2>
          <p>
            AVI CERTIFY s'engage à fournir les services avec le plus grand
            soin et conformément aux standards en vigueur. Toutefois, la
            responsabilité d'AVI CERTIFY ne saurait être engagée en cas de
            refus de visa ou de dossier par les autorités compétentes, ces
            décisions relevant de la compétence exclusive des services
            consulaires et administratifs.
          </p>
          <p>
            En cas d'anomalie dans la génération ou la conformité d'une
            attestation émise par AVI CERTIFY, notre support vérifie le dossier
            et vous accompagne dans la résolution.
          </p>

          <h2>8. Protection des données</h2>
          <p>
            Les données personnelles sont traitées conformément à notre{" "}
            <a href="/confidentialite">politique de confidentialité</a> et au
            RGPD.
          </p>

          <h2>9. Contact</h2>
          <p>
            Pour toute question concernant ces conditions, contactez-nous à :{" "}
            <a href="mailto:contact@avicertify.com">contact@avicertify.com</a>
          </p>
        </div>
      </section>
    </>
  );
}
