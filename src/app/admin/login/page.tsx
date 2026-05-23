import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[hsl(222,75%,8%)] text-white">
      <div className="container flex min-h-screen items-center justify-center py-16">
        <div className="max-w-xl rounded-lg border border-white/15 bg-white/[0.08] p-8 shadow-2xl">
          <LockKeyhole className="h-10 w-10 text-[hsl(var(--institutional-yellow))]" aria-hidden="true" />
          <h1 className="mt-5 text-3xl font-semibold">Accès admin requis</h1>
          <p className="mt-4 leading-7 text-slate-200">
            Le backoffice fintech AVI CERTIFY est privé. L’accès production doit passer par un compte ADMIN, une session sécurisée et une future étape 2FA.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Retour au site public
          </Link>
        </div>
      </div>
    </main>
  );
}
