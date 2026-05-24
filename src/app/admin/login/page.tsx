import Link from "next/link";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[hsl(222,75%,8%)] text-white">
      <div className="container flex min-h-screen items-center justify-center py-16">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
          <Suspense fallback={<div className="rounded-lg border border-white/15 bg-white/[0.08] p-8">Chargement de l'acces admin...</div>}>
            <AdminLoginForm />
          </Suspense>

          <aside className="rounded-lg border border-white/15 bg-white/[0.06] p-6">
            <p className="text-sm font-semibold uppercase tracking-normal text-[hsl(var(--institutional-yellow))]">
              Private fintech access
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              <li>Firebase Auth email/password.</li>
              <li>Custom claims admin or super_admin required.</li>
              <li>Server-created session cookie.</li>
              <li>Middleware guard validates signed admin session metadata.</li>
              <li>TOTP 2FA architecture prepared for the next phase.</li>
            </ul>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-md border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Retour au site public
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
