"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getLatestPaymentSummary,
  getRequiredDocumentSummary,
  getUserProfileSummary,
  type UserProfileSummary,
} from "@/lib/dashboard/dashboard-data.service";
import { getDossierWorkflowStatus } from "@/lib/workflow/workflow-engine";
import type { ApplicationDocument, ApplicationPayment, ApplicationStatus } from "@/types/application";

export type WorkflowState = {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  profileComplete: boolean;
  hasDocuments: boolean;
  documentsComplete: boolean;
  paymentComplete: boolean;
  workflowStatus: ApplicationStatus | null;
  loading: boolean;
};

const emptyDocuments: ApplicationDocument[] = [];
const emptyPayment: ApplicationPayment = {
  status: "not_started",
  amountLabel: "Non démarré",
  description: "Aucun paiement",
};

/**
 * Workflow-aware state hook that combines Firebase Auth + Firestore data
 * to enable intelligent navigation decisions across the platform.
 *
 * Used by WorkflowAwareLink and process steps to route users based on:
 * - Authentication status
 * - Email verification
 * - Profile completion
 * - Document upload state
 * - Payment status
 * - Overall workflow progression
 */
export function useWorkflowState(): WorkflowState {
  const { isAuthenticated, isEmailVerified, user } = useAuth();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>(emptyDocuments);
  const [payment, setPayment] = useState<ApplicationPayment>(emptyPayment);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkflowState() {
      if (!user || !isEmailVerified) {
        setProfile(null);
        setDocuments(emptyDocuments);
        setPayment(emptyPayment);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [profileData, documentsData, paymentData] = await Promise.all([
          getUserProfileSummary(user.uid),
          getRequiredDocumentSummary(user.uid),
          getLatestPaymentSummary(user.uid),
        ]);

        if (!cancelled) {
          setProfile(profileData);
          setDocuments(documentsData);
          setPayment(paymentData);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load workflow state:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkflowState();

    return () => {
      cancelled = true;
    };
  }, [user, isEmailVerified]);

  const profileComplete = profile?.completionState === "complete";
  const hasDocuments = documents.some((doc) =>
    doc.workflowStatus && doc.workflowStatus !== "missing"
  );
  const documentsComplete = documents.every((doc) =>
    doc.required ? doc.workflowStatus === "approved" : true
  );
  const paymentComplete = payment.status === "paid";

  const workflowStatus = isAuthenticated && !loading
    ? getDossierWorkflowStatus({ documents, payment })
    : null;

  return {
    isAuthenticated,
    isEmailVerified,
    profileComplete,
    hasDocuments,
    documentsComplete,
    paymentComplete,
    workflowStatus,
    loading,
  };
}
