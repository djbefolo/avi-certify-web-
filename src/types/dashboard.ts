import type {
  ApplicationDocument,
  ApplicationPayment,
  ApplicationStatus,
  TimelineStep,
} from "@/types/application";
import type { StudentProfile } from "@/types/student-profile";

export type DashboardSummary = {
  applicationStatus: ApplicationStatus;
  applicationStatusLabel: string;
  currentStep: string;
  completionPercent: number;
  destinationCountry: string;
  requestedService: string;
  advisorName: string;
  documents: ApplicationDocument[];
  payment: ApplicationPayment;
  profile: {
    data: StudentProfile | null;
    completionPercent: number;
    completionState: "incomplete" | "partial" | "complete";
  };
  timeline: TimelineStep[];
  nextAction: {
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  };
};
