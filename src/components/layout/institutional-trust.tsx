import { Building2, Shield, ExternalLink } from "lucide-react";

export function InstitutionalTrust() {
  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-primary-dark to-primary">
      <div className="container py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold text-white md:text-3xl">
              Identification institutionnelle et réglementaire
            </h2>
            <p className="mt-3 text-sm text-gray-300 md:text-base">
              Société immatriculée et régulée au Canada et en France
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Building2 className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-white md:text-2xl">
                  CANADA 🇨🇦
                </h3>
              </div>
              <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                <p>
                  AVI CERTIFY est une société canadienne spécialisé dans les solutions de mobilité internationale, les services financiers et les services de paiement transfrontaliers. AVI CERTIFY est constituée conformément à la Loi canadienne sur les sociétés par actions sous le numéro fédéral <strong className="text-white">1679850-1</strong> et enregistré en Ontario en qualité de société extra provinciale, avec siège social et bureau principal à Toronto au Canada.
                </p>
                <p>
                  AVI CERTIFY exerce ses activités en qualité d'Entreprise de Service Monétaires (ESM/MSB) enregistré auprès du Centre d'analyse des opérations et déclarations financières du Canada (FINTRAC/CANAFE) sous le numéro d'enregistrement <strong className="text-white">C10001355</strong>. AVI CERTIFY ayant pour principales activités : les opérations de change, de transmission et remise de fonds, les services de paiement (PSP), les Emissions et rachat de mandats.
                </p>
                <div className="pt-4">
                  <a
                    href="https://fintrac-canafe.canada.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-accent-light transition-colors hover:bg-accent/20 hover:text-accent"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">FINTRAC/CANAFE</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-white md:text-2xl">
                  FRANCE 🇫🇷
                </h3>
              </div>
              <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                <p>
                  AVI CERTIFY est une société de courtage financier régie par le Code Monétaire et Financier Français, immatriculée au registre des intermédiaires en opérations de banque et service de paiement sous le N°<strong className="text-white">25005516</strong> (peut être consulté sur le site de l'Orias, www.orias.fr) et ayant souscrit à une assurance Responsabilité Civile Professionnelle (police N°<strong className="text-white">BZIOB0001804</strong>) est une garantie financière (police N°<strong className="text-white">BZIOB001804</strong>) auprès de l'assureur Lloyd's Insurance Company S.A, représentée par +Simple (www.plusimple.fr), en application des articles L.519-3-4 et R.519-16-17 du Code Monétaire et Financier.
                </p>
                <p>
                  AVI CERTIFY exerce ses activités sous le contrôle de l'ACPR-Autorité de Contrôle Prudentiel et de Résolution, 4 Place de Budapest, 75436 Paris Cedex 09.
                </p>
                <div className="flex flex-wrap gap-3 pt-4">
                  <a
                    href="https://www.orias.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-accent-light transition-colors hover:bg-accent/20 hover:text-accent"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">ORIAS</span>
                  </a>
                  <a
                    href="https://acpr.banque-france.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-accent-light transition-colors hover:bg-accent/20 hover:text-accent"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">ACPR</span>
                  </a>
                  <a
                    href="https://www.plusimple.fr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 text-accent-light transition-colors hover:bg-accent/20 hover:text-accent"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    <span className="font-medium">+Simple</span>
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
