import { Building2, Shield, ExternalLink } from "lucide-react";

export function InstitutionalTrust() {
  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-primary-dark to-primary">
      <div className="container py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Identification institutionnelle et réglementaire
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Société immatriculée et régulée au Canada et en France
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  CANADA 🇨🇦
                </h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-300">
                <p>
                  AVI CERTIFY est une société canadienne spécialisée dans les solutions de mobilité internationale, les services financiers et les services de paiement transfrontaliers.
                </p>
                <p>
                  AVI CERTIFY est constituée conformément à la Loi canadienne sur les sociétés par actions sous le <strong className="text-white">numéro fédéral 1679850-1</strong> et enregistrée en Ontario en qualité de société extra-provinciale, avec siège social et bureau principal à Toronto au Canada.
                </p>
                <div className="rounded-md border border-accent/20 bg-accent/10 p-3">
                  <p className="font-semibold text-accent-light">
                    Entreprise de Service Monétaires (ESM/MSB)
                  </p>
                  <p className="mt-1">
                    Enregistrée auprès du Centre d'analyse des opérations et déclarations financières du Canada (FINTRAC/CANAFE) sous le <strong className="text-white">numéro d'enregistrement C10001355</strong>.
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Principales activités : opérations de change, transmission et remise de fonds, services de paiement (PSP), émissions et rachat de mandats.
                  </p>
                </div>
                <a
                  href="https://fintrac-canafe.canada.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent-light transition-colors hover:text-accent"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>FINTRAC/CANAFE</span>
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Shield className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  FRANCE 🇫🇷
                </h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-300">
                <p>
                  AVI CERTIFY est une société de courtage financier régie par le Code Monétaire et Financier Français.
                </p>
                <p>
                  Immatriculée au registre des intermédiaires en opérations de banque et service de paiement sous le <strong className="text-white">N°25005516</strong> (consultable sur ORIAS).
                </p>
                <div className="rounded-md border border-accent/20 bg-accent/10 p-3">
                  <p className="font-semibold text-accent-light">
                    Assurances professionnelles
                  </p>
                  <p className="mt-1">
                    Assurance Responsabilité Civile Professionnelle <strong className="text-white">(police N°BZIOB0001804)</strong> et garantie financière <strong className="text-white">(police N°BZIOB001804)</strong> auprès de l'assureur Lloyd's Insurance Company S.A, représentée par +Simple.
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Conformément aux articles L.519-3-4 et R.519-16-17 du Code Monétaire et Financier.
                  </p>
                </div>
                <p className="font-semibold text-white">
                  Sous le contrôle de l'ACPR
                </p>
                <p className="text-xs text-gray-400">
                  Autorité de Contrôle Prudentiel et de Résolution, 4 Place de Budapest, 75436 Paris Cedex 09.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://www.orias.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent-light transition-colors hover:text-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>ORIAS</span>
                  </a>
                  <a
                    href="https://acpr.banque-france.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent-light transition-colors hover:text-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>ACPR</span>
                  </a>
                  <a
                    href="https://www.plusimple.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-accent-light transition-colors hover:text-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>+Simple</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
