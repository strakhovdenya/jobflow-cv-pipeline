import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImportPreview } from "./import-preview";
import { confirmImportFolderAction, previewImportFolderAction } from "./actions";
import type {
  ImportConfirmActionResult,
  ImportPreviewActionResult,
} from "./actions";
import type { ImportScanResult } from "@/lib/api";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("./actions", () => ({
  previewImportFolderAction: vi.fn(),
  confirmImportFolderAction: vi.fn(),
}));

const previewImportFolderActionMock = vi.mocked(previewImportFolderAction);
const confirmImportFolderActionMock = vi.mocked(confirmImportFolderAction);

const scanResults: ImportScanResult[] = [
  {
    folderPath: "/legacy/Acme_Corp/2026.01.15",
    companyNameOriginal: "Acme Corp",
    companySlug: "Acme_Corp",
    roleTitleOriginal: "Backend Developer",
    roleSlug: "Backend_Developer",
    legacyDate: "2026-01-15",
    legacyDateConfidence: "high",
    vacancySourceCandidates: ["/legacy/Acme_Corp/2026.01.15/Acme_Corp_Backend_Developer.txt"],
    detectedArtifacts: [
      {
        type: "vacancy_source",
        filePath: "/legacy/Acme_Corp/2026.01.15/Acme_Corp_Backend_Developer.txt",
      },
    ],
    suggestedStatus: "source_saved",
    warnings: [],
  },
];

const basePreviewResult = {
  folderPath: scanResults[0].folderPath,
  companyNameOriginal: "Acme Corp",
  companySlug: "Acme_Corp",
  roleTitleOriginal: "Backend Developer",
  roleSlug: "Backend_Developer",
  legacyDate: "2026-01-15",
  legacyDateConfidence: "high" as const,
  vacancySourceCandidates: scanResults[0].vacancySourceCandidates,
  detectedArtifacts: scanResults[0].detectedArtifacts,
  suggestedStatus: "source_saved" as const,
  warnings: [],
  isDuplicate: false,
};

describe("ImportPreview", () => {
  beforeEach(() => {
    pushMock.mockReset();
    previewImportFolderActionMock.mockReset();
    confirmImportFolderActionMock.mockReset();
  });

  it("renders the scanned folder list", () => {
    render(<ImportPreview scanResults={scanResults} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Backend Developer")).toBeInTheDocument();
  });

  it("previews a selected folder and shows its details", async () => {
    const result: ImportPreviewActionResult = { ok: true, data: basePreviewResult };
    previewImportFolderActionMock.mockResolvedValue(result);

    const user = userEvent.setup();
    render(<ImportPreview scanResults={scanResults} />);

    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.getByText("source_saved")).toBeInTheDocument();
    });
    expect(previewImportFolderActionMock).toHaveBeenCalledWith({
      folderPath: scanResults[0].folderPath,
      companyNameOverride: undefined,
      roleTitleOverride: undefined,
    });
    expect(screen.queryByTestId("duplicate-banner")).not.toBeInTheDocument();
  });

  it("shows a distinct banner when the folder is a duplicate", async () => {
    const result: ImportPreviewActionResult = {
      ok: true,
      data: {
        ...basePreviewResult,
        isDuplicate: true,
        duplicateReason: "content_hash",
        duplicateWorkspaceId: "workspace-existing",
      },
    };
    previewImportFolderActionMock.mockResolvedValue(result);

    const user = userEvent.setup();
    render(<ImportPreview scanResults={scanResults} />);

    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.getByTestId("duplicate-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("duplicate-banner")).toHaveTextContent("vacancy content hash");
    expect(screen.getByTestId("duplicate-banner")).toHaveTextContent("workspace-existing");
  });

  it("confirms an import and navigates to the new workspace", async () => {
    previewImportFolderActionMock.mockResolvedValue({ ok: true, data: basePreviewResult });
    const confirmResult: ImportConfirmActionResult = {
      ok: true,
      data: {
        workspaceId: "workspace-1",
        companyId: "company-1",
        jobVacancyId: "vacancy-1",
        workspaceSlug: "2026_01_15_Acme_Corp_Backend_Developer",
        companySlug: "Acme_Corp",
        roleSlug: "Backend_Developer",
        status: "source_saved",
        registeredArtifactIds: ["artifact-1"],
      },
    };
    confirmImportFolderActionMock.mockResolvedValue(confirmResult);

    const user = userEvent.setup();
    render(<ImportPreview scanResults={scanResults} />);

    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm import/ })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /Confirm import/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/workspaces/workspace-1");
    });
    expect(confirmImportFolderActionMock).toHaveBeenCalledWith({
      folderPath: scanResults[0].folderPath,
      companyNameOverride: undefined,
      roleTitleOverride: undefined,
      selectedVacancySourcePath: scanResults[0].vacancySourceCandidates[0],
      copyVacancySourceToCanonical: false,
    });
  });

  it("disables confirm until a vacancy source candidate is chosen when ambiguous", async () => {
    previewImportFolderActionMock.mockResolvedValue({
      ok: true,
      data: { ...basePreviewResult, vacancySourceCandidates: [] },
    });

    const user = userEvent.setup();
    render(<ImportPreview scanResults={scanResults} />);

    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm import/ })).toBeDisabled();
    });
  });

  it("renders validation errors returned by the preview action", async () => {
    previewImportFolderActionMock.mockResolvedValue({
      ok: false,
      errors: ["folderPath must be one of the scanned folders"],
    });

    const user = userEvent.setup();
    render(<ImportPreview scanResults={scanResults} />);

    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(
        screen.getByText("folderPath must be one of the scanned folders"),
      ).toBeInTheDocument();
    });
  });
});
