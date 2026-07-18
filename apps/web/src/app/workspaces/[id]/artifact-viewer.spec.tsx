import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtifactViewer } from "./artifact-viewer";
import type { WorkspaceArtifactSummary } from "@/lib/api";

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-1",
    artifactType: "vacancy_source",
    canonicalFileName: "00_vacancy_source.txt",
    downloadFileName: "SOURCE_acme_dev.txt",
    isLatest: true,
    version: 1,
    mimeType: "text/plain",
    fileSizeBytes: 123,
    createdAt: "2026-07-19T00:00:00.000Z",
    ...overrides,
  };
}

describe("ArtifactViewer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the empty state when there are no artifacts", () => {
    render(<ArtifactViewer artifacts={[]} />);

    expect(screen.getByText("No artifacts yet.")).toBeInTheDocument();
  });

  it("renders a download link pointing at the proxy route for each artifact", () => {
    const artifact = makeArtifact();
    render(<ArtifactViewer artifacts={[artifact]} />);

    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute(
      "href",
      "/api/artifacts/artifact-1/download",
    );
  });

  it("fetches and renders content inline when View is clicked on a text artifact", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("vacancy text content"),
    } as Response);

    const user = userEvent.setup();
    render(<ArtifactViewer artifacts={[makeArtifact()]} />);

    await user.click(screen.getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(screen.getByText("vacancy text content")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/artifacts/artifact-1/download");
  });

  it("does not show a View button for a non-text artifact", () => {
    render(
      <ArtifactViewer
        artifacts={[makeArtifact({ mimeType: "application/pdf" })]}
      />,
    );

    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });

  it("falls back to the filename extension when mimeType is null", () => {
    render(
      <ArtifactViewer
        artifacts={[
          makeArtifact({
            mimeType: null,
            canonicalFileName: "00_vacancy_source.txt",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
  });

  it("shows an inline error when the content fetch fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: false, status: 404 } as Response);

    const user = userEvent.setup();
    render(<ArtifactViewer artifacts={[makeArtifact()]} />);

    await user.click(screen.getByRole("button", { name: "View" }));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load content (status 404)"),
      ).toBeInTheDocument();
    });
  });
});
