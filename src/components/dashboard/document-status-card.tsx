import { FileText } from "lucide-react";
import type { ApplicationDocument } from "@/types/application";
import { getDocumentStatusLabel, getStatusClassName } from "@/components/dashboard/status-styles";
import { cn } from "@/lib/utils";

type DocumentStatusCardProps = {
  documents: ApplicationDocument[];
};

export function DocumentStatusCard({ documents }: DocumentStatusCardProps) {
  return (
    <article className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Pieces justificatives</p>
          <h2 className="mt-2 text-xl font-semibold">Documents requis</h2>
        </div>
        <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-5 grid gap-3">
        {documents.map((document) => (
          <div key={document.id} className="rounded-md border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{document.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {document.description}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
                  getStatusClassName(document.status),
                )}
              >
                {getDocumentStatusLabel(document.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
