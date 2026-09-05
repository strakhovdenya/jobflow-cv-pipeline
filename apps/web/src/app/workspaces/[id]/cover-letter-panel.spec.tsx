import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CoverLetterPanel } from "./cover-letter-panel";
import { generateCoverLetterAction } from "./actions";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  generateCoverLetterAction: vi.fn(),
}));

const generateCoverLetterActionMock = vi.mocked(generateCoverLetterAction);

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-cover-letter-json-1",
    artifactType: "cover_letter_json",
    canonicalFileName: "cover_letter.json",
    downloadFileName: "Strakhov_Denys_Acme_Corp_Backend_Developer_CoverLetter.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 123,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makePdfArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-cover-letter-pdf-1",
    artifactType: "cover_letter_pdf",
    canonicalFileName: "cover_letter.pdf",
    downloadFileName: "Strakhov_Denys_Acme_Corp_Backend_Developer_CoverLetter.pdf",
    isLatest: true,
    version: 1,
    mimeType: "application/pdf",
    fileSizeBytes: 456,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeMdArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-cover-letter-md-1",
    artifactType: "cover_letter_md",
    canonicalFileName: "cover_letter.md",
    downloadFileName: "Strakhov_Denys_Acme_Corp_Backend_Developer_CoverLetter.md",
    isLatest: true,
    version: 1,
    mimeType: "text/markdown",
    fileSizeBytes: 789,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("CoverLetterPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    generateCoverLetterActionMock.mockReset();
  });

  it("renders nothing outside cv_pdf_generated/final_check_ready when no cover letter exists yet", () => {
    const { container } = render(
      <CoverLetterPanel workspaceId="ws-1" status="paused_after_cv_draft" artifacts={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the trigger button at cv_pdf_generated", () => {
    render(<CoverLetterPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    expect(
      screen.getByRole("button", { name: "Generate cover letter" }),
    ).toBeInTheDocument();
  });

  it("shows the trigger button at final_check_ready", () => {
    render(<CoverLetterPanel workspaceId="ws-1" status="final_check_ready" artifacts={[]} />);

    expect(
      screen.getByRole("button", { name: "Generate cover letter" }),
    ).toBeInTheDocument();
  });

  it("hides the trigger button but still shows the panel once status has advanced past the eligible statuses, as long as a cover letter artifact exists", () => {
    render(
      <CoverLetterPanel
        workspaceId="ws-1"
        status="cover_letter_generated"
        artifacts={[makeArtifact(), makePdfArtifact(), makeMdArtifact()]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Generate cover letter" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Cover Letter (MD)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Cover Letter (PDF)" }),
    ).toBeInTheDocument();
  });

  it("shows download buttons for md and pdf when both artifacts are present", () => {
    render(
      <CoverLetterPanel
        workspaceId="ws-1"
        status="cover_letter_generated"
        artifacts={[makeArtifact(), makePdfArtifact(), makeMdArtifact()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Download Cover Letter (MD)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Cover Letter (PDF)" }),
    ).toBeInTheDocument();
  });

  it("shows only md button when pdf artifact is absent", () => {
    render(
      <CoverLetterPanel
        workspaceId="ws-1"
        status="cover_letter_generated"
        artifacts={[makeArtifact(), makeMdArtifact()]}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Download Cover Letter (MD)" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download Cover Letter (PDF)" }),
    ).not.toBeInTheDocument();
  });

  it("falls back to the artifacts-section text when neither md nor pdf download URLs are available", () => {
    render(
      <CoverLetterPanel
        workspaceId="ws-1"
        status="cover_letter_generated"
        artifacts={[makeArtifact()]}
      />,
    );

    expect(
      screen.getByText("Generated cover letter is available in the Artifacts section above."),
    ).toBeInTheDocument();
  });

  it("calls the action and refreshes on success", async () => {
    generateCoverLetterActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        promptRunId: "run-1",
        aiRunId: "ai-1",
        workspaceStatus: "cover_letter_generated",
      },
    });

    const user = userEvent.setup();
    render(<CoverLetterPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(generateCoverLetterActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("shows a validation error without refreshing when generation fails", async () => {
    generateCoverLetterActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: false,
        promptRunId: "run-1",
        aiRunId: "ai-1",
        workspaceStatus: "cv_pdf_generated",
        validationError: "bad JSON",
      },
    });

    const user = userEvent.setup();
    render(<CoverLetterPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => {
      expect(screen.getByText("bad JSON")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("surfaces action-level errors (e.g. network failure) without refreshing", async () => {
    generateCoverLetterActionMock.mockResolvedValue({
      ok: false,
      errors: ["Network error"],
    });

    const user = userEvent.setup();
    render(<CoverLetterPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Generate cover letter" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
