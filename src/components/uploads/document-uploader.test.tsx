import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentUploader } from "@/components/uploads/document-uploader";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: {
      uid: "user-1",
    },
  }),
}));

vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackDocumentUploaded: vi.fn(),
  }),
}));

vi.mock("@/lib/documents/document.service", () => ({
  uploadDocument: vi.fn(),
}));

describe("DocumentUploader", () => {
  it("rejects unsupported file types before upload", async () => {
    const user = userEvent.setup();

    render(<DocumentUploader />);

    await user.selectOptions(screen.getByLabelText(/type de document/i), [
      "passport",
    ]);
    await user.upload(
      screen.getByLabelText(/glissez un fichier/i),
      new File(["notes"], "notes.txt", { type: "text/plain" }),
    );

    expect(
      await screen.findByText(/Formats acceptes : PDF, JPG ou PNG/i),
    ).toBeInTheDocument();
  });
});
