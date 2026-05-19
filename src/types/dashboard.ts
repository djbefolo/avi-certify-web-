import type {
  ApplicationDocument,
  ApplicationPayment,
  ApplicationStatus,
  TimelineStep,
} from "@/types/application";

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
  timeline: TimelineStep[];
  nextAction: {
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  };
};
