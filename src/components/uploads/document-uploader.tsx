"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  UploadCloud,
} from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { uploadDocument } from "@/lib/documents/document.service";
import {
  acceptedDocumentMimeTypes,
  documentTypeLabels,
  documentTypeValues,
  maxDocumentFileSize,
  validateDocumentUpload,
} from "@/lib/validations/document";
import type { DocumentType, UserDocument } from "@/types/document";
import { useAuth } from "@/hooks/use-auth";
import { useAnalytics } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DocumentUploaderProps = {
  onDocumentUploaded?: (document: UserDocument) => void;
};

type UploadState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible d'envoyer le document pour le moment.";
}

function getFileSizeLabel(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentUploader({ onDocumentUploaded }: DocumentUploaderProps) {
  const fileInputId = useId();
  const submitLockRef = useRef(false);
  const { user } = useAuth();
  const { trackDocumentUploaded } = useAnalytics();
  const [documentType, setDocumentType] = useState<DocumentType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = (nextFile: File | undefined) => {
    setUploadState({ status: "idle" });

    if (!nextFile) {
      setFile(null);
      return;
    }

    try {
      if (!documentType) {
        throw new Error("Selectionnez un type de document avant le fichier.");
      }

      validateDocumentUpload({
        uid: user?.uid ?? "pending",
        documentType,
        file: nextFile,
      });
      setFile(nextFile);
    } catch (error) {
      setFile(null);
      setUploadState({ status: "error", message: getErrorMessage(error) });
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    setUploadState({ status: "idle" });
    setProgress(0);
    setIsUploading(true);

    try {
      if (!user) {
        throw new Error("Vous devez etre connecte pour envoyer un document.");
      }

      if (!documentType || !file) {
        throw new Error("Selectionnez un type de document et un fichier.");
      }

      const uploadedDocument = await uploadDocument({
        uid: user.uid,
        documentType,
        file,
        onProgress: setProgress,
      });

      setFile(null);
      setDocumentType("");
      setProgress(100);
      setUploadState({
        status: "success",
        message: "Document envoye et enregistre dans votre dossier.",
      });
      trackDocumentUploaded(uploadedDocument.documentType);
      onDocumentUploaded?.(uploadedDocument);
    } catch (error) {
      setUploadState({ status: "error", message: getErrorMessage(error) });
    } finally {
      submitLockRef.current = false;
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-md border bg-background p-5 shadow-sm md:p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
        <UploadCloud className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">Envoyer un document</h2>
      <p className="mt-2 leading-7 text-muted-foreground">
        Formats acceptes : PDF, JPG ou PNG. Taille maximale : 5 MB.
      </p>

      <div className="mt-5 grid gap-5">
        {uploadState.status === "success" ? (
          <div
            className="flex gap-3 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm"
            role="status"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p>{uploadState.message}</p>
          </div>
        ) : null}

        {uploadState.status === "error" ? (
          <div
            className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p>{uploadState.message}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="document-type">Type de document</Label>
          <Select
            id="document-type"
            value={documentType}
            disabled={isUploading}
            onChange={(event) =>
              setDocumentType(event.target.value as DocumentType | "")
            }
          >
            <option value="">Selectionner</option>
            {documentTypeValues.map((value) => (
              <option key={value} value={value}>
                {documentTypeLabels[value]}
              </option>
            ))}
          </Select>
        </div>

        <div
          className={cn(
            "rounded-md border border-dashed bg-muted/25 p-5 transition-colors",
            isDragging && "border-primary bg-primary/10",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Label
            htmlFor={fileInputId}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 text-center"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-background">
              <FileUp className="h-5 w-5 text-primary" aria-hidden="true" />
            </span>
            <span className="font-medium">
              Glissez un fichier ici ou selectionnez-le
            </span>
            <span className="text-sm text-muted-foreground">
              PDF, JPG ou PNG jusqu'a {getFileSizeLabel(maxDocumentFileSize)}
            </span>
          </Label>
          <input
            id={fileInputId}
            type="file"
            className="sr-only"
            accept={acceptedDocumentMimeTypes.join(",")}
            disabled={isUploading}
            onChange={handleInputChange}
          />
        </div>

        {file ? (
          <div className="rounded-md border bg-muted/25 p-4 text-sm">
            <p className="font-medium">{file.name}</p>
            <p className="mt-1 text-muted-foreground">
              {file.type || "Type inconnu"} - {getFileSizeLabel(file.size)}
            </p>
          </div>
        ) : null}

        {isUploading ? (
          <div aria-live="polite">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Upload en cours</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          disabled={isUploading || !documentType || !file}
          aria-busy={isUploading}
          onClick={handleSubmit}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
          )}
          {isUploading ? "Envoi..." : "Envoyer le document"}
        </Button>
      </div>
    </section>
  );
}
