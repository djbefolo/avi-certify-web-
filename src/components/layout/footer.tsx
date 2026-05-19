import Link from "next/link";
import { navLinks } from "@/constants/navigation";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              AVI
            </span>
            <span>AVI CERTIFY</span>
          </Link>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Plateforme d'accompagnement étudiant pour les démarches AVI,
            hébergement, préfinancement et visa.
          </p>
        </div>

        <div className="grid gap-3 text-sm md:justify-end">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground md:text-right"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-2 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AVI CERTIFY. Tous droits réservés.</p>
          <p>Mentions légales et confidentialité à finaliser.</p>
        </div>
      </div>
    </footer>
  );
}
