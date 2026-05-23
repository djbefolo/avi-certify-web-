"use client";

import Link from "next/link";
import { useWorkflowState } from "@/hooks/use-workflow-state";
import type { ReactNode } from "react";

type WorkflowAwareLinkProps = {
  /** Route when user is not authenticated */
  unauthenticatedHref: string;

  /** Route when authenticated but profile incomplete */
  profileIncompleteHref?: string;

  /** Route when authenticated, profile complete, but documents missing */
  documentsMissingHref?: string;

  /** Route when authenticated, documents present, but payment incomplete */
  paymentPendingHref?: string;

  /** Route when workflow is complete or default authenticated route */
  authenticatedHref: string;

  children: ReactNode;
  className?: string;
};

/**
 * Workflow-aware navigation component that routes users based on their
 * current workflow state (auth, profile, documents, payment).
 *
 * Enables intelligent navigation like:
 * - Step 1: Not authenticated → /inscription
 * - Step 1: Authenticated, profile incomplete → /profil
 * - Step 1: Authenticated, profile complete → /dashboard
 *
 * Replaces simple AuthAwareLink with backend-driven intelligence.
 */
export function WorkflowAwareLink({
  unauthenticatedHref,
  profileIncompleteHref,
  documentsMissingHref,
  paymentPendingHref,
  authenticatedHref,
  children,
  className,
}: WorkflowAwareLinkProps) {
  const workflow = useWorkflowState();

  let href = unauthenticatedHref;

  if (workflow.isAuthenticated && workflow.isEmailVerified) {
    // Authenticated flow: apply workflow intelligence

    if (!workflow.profileComplete && profileIncompleteHref) {
      href = profileIncompleteHref;
    } else if (!workflow.hasDocuments && documentsMissingHref) {
      href = documentsMissingHref;
    } else if (!workflow.paymentComplete && paymentPendingHref) {
      href = paymentPendingHref;
    } else {
      href = authenticatedHref;
    }
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
