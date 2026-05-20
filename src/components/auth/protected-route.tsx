"use client";

import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { loading, isAuthenticated, isEmailVerified } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/connexion");
      return;
    }

    if (!isEmailVerified) {
      router.replace("/verification-email");
    }
  }, [isAuthenticated, isEmailVerified, loading, router]);

  if (loading || !isAuthenticated || !isEmailVerified) {
    return (
      <section className="container flex min-h-[48vh] items-center justify-center py-16">
        <div className="grid justify-items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-background">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-primary" />
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Verification de votre acces securise...
          </p>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
