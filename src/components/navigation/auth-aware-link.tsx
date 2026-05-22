"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";

type AuthAwareLinkProps = {
  authenticatedHref: string;
  unauthenticatedHref: string;
  children: ReactNode;
  className?: string;
};

export function AuthAwareLink({
  authenticatedHref,
  unauthenticatedHref,
  children,
  className,
}: AuthAwareLinkProps) {
  const { isAuthenticated } = useAuth();
  const href = isAuthenticated ? authenticatedHref : unauthenticatedHref;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
