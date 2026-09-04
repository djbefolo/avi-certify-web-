import Link from "next/link";
import Image from "next/image";
import { Shield, Mail, Building2, MessageCircle, Facebook, Linkedin, ExternalLink } from "lucide-react";
import { InstitutionalTrust } from "@/components/layout/institutional-trust";
import { navLinks } from "@/constants/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t text-white">
      <InstitutionalTrust />
      <div className="border-t border-white/10 bg-[hsl(222,75%,8%)]">
        <div className="container grid gap-10 py-12 md:grid-cols-[1.2fr_0.9fr_0.9fr] md:py-16">
        <div>
          <Link
            href="/"
            className="inline-block"
          >
            <Image
              src="/assets/photos/logo_avi_certify.png"
              alt="AVI CERTIFY"
              width={160}
              height={40}
              className="h-10 w-auto brightness-0 invert"
            />
          </Link>

          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[hsl(var(--institutional-yellow))]/35 bg-[hsl(var(--institutional-yellow))]/10 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-[hsl(var(--institutional-yellow))]" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--institutional-yellow))]">
              Société immatriculée
            </span>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-7 text-gray-300">
            Service d'accompagnement étudiant pour les démarches AVI,
            hébergement, préfinancement et visa.
          </p>

          <div className="mt-6 grid gap-3 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <Building2
                className="mt-0.5 h-4 w-4 shrink-0 text-accent-light"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-white">AVI CERTIFY</p>
                <p className="text-xs text-gray-400">
                  SAS au capital social de 10 000 €
                </p>
                <p className="mt-1">75 Rue de Besançon</p>
                <p>25300 Pontarlier, France</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail
                className="h-4 w-4 shrink-0 text-accent-light"
                aria-hidden="true"
              />
              <a
                href="mailto:contact@avicertify.fr"
                className="transition-colors hover:text-white"
              >
                contact@avicertify.fr
              </a>
            </div>
          </div>

          <div className="mt-6 space-y-2 border-t border-white/10 pt-6 text-sm">
            <p className="font-semibold text-[hsl(var(--institutional-yellow))]">
              Identification légale
            </p>
            <p className="text-gray-300">RCS Besançon: 942 370 545</p>
            <p className="text-gray-300">ORIAS: 25005516</p>
            <p className="text-xs text-gray-400">
              Activité déclarée et enregistrée
            </p>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold text-accent-light">Contact direct</p>
            <a
              href="https://wa.me/message/XOKRBYI3ZEQBM1"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-gray-300 transition-colors hover:text-white"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Discuter sur WhatsApp
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Navigation</h3>
          <nav className="mt-4 grid gap-3 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-300 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://verify.avicertify.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-300 transition-colors hover:text-white"
            >
              Vérifier une AVI
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Légal</h3>
          <nav className="mt-4 grid gap-3 text-sm">
            <Link
              href="/mentions-legales"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Mentions légales
            </Link>
            <Link
              href="/confidentialite"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Confidentialité
            </Link>
            <Link
              href="/cgv"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Conditions générales
            </Link>
            <Link
              href="/contact"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Support client
            </Link>
          </nav>

          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold text-white">Suivez-nous</p>
            <div className="mt-3 flex items-center gap-3">
              <a
                href="https://www.facebook.com/share/1HoEpQytnw/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-colors hover:bg-white/20"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4 text-white" aria-hidden="true" />
              </a>
              <a
                href="https://www.linkedin.com/company/avi-certify/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 transition-colors hover:bg-white/20"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4 text-white" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="border-t border-white/10 bg-[hsl(222,75%,6%)]">
        <div className="container flex flex-col gap-2 py-5 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} AVI CERTIFY. Tous droits réservés.</p>
          <p className="text-xs">
            Service d'accompagnement étudiant et mobilité internationale
          </p>
        </div>
      </div>
    </footer>
  );
}
