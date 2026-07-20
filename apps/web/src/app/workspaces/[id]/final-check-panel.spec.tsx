import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinalCheckPanel } from "./final-check-panel";
import { runFinalCheckAction } from "./actions";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runFinalCheckAction: vi.fn(),
}));

const runFinalCheckActionMock = vi.mocked(runFinalCheckAction);

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-json-1",
    artifactType: "final_check_json",
    canonicalFileName: "05_final_check.json",
    downloadFileName: "FINALCHECK_acme_dev.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 123,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

const CHECKLIST = {
  pdf_opens: true,
  content_matches_vacancy: true,
  no_unsupported_claims: true,
  contact_info_present: true,
  ready_to_apply: true,
};

describe("FinalCheckPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    runFinalCheckActionMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing outside cv_pdf_generated/final_check_ready", () => {
    const { container } = render(
      <FinalCheckPanel workspaceId="ws-1" status="paused_after_cv_draft" artifacts={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("hides the trigger button but still shows the result once status has advanced to final_check_ready", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          final_decision: "ready_to_send",
          quality_score: 92,
          page_count: 1,
          missing_sections: [],
          formatting_issues: [],
          overclaiming_issues: [],
          broken_links: [],
          warnings: [],
          final_checklist: CHECKLIST,
        }),
    } as Response);

    render(
      <FinalCheckPanel
        workspaceId="ws-1"
        status="final_check_ready"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("ready_to_send — quality score: 92 — 1 page"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Run final check" })).not.toBeInTheDocument();
  });

  it("still shows a fetched result at a later, unlisted status as long as the artifact exists (eligibility is artifact-driven, not a status whitelist)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          final_decision: "ready_to_send",
          quality_score: 92,
          page_count: 1,
          missing_sections: [],
          formatting_issues: [],
          overclaiming_issues: [],
          broken_links: [],
          warnings: [],
          final_checklist: CHECKLIST,
        }),
    } as Response);

    render(
      <FinalCheckPanel
        workspaceId="ws-1"
        status="cover_letter_generated"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("ready_to_send — quality score: 92 — 1 page"),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Run final check" })).not.toBeInTheDocument();
  });

  it("shows the trigger button and calls the action, then refreshes on success", async () => {
    runFinalCheckActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: true,
        promptRunId: "run-1",
        aiRunId: "ai-1",
        workspaceStatus: "cv_pdf_generated",
        finalDecision: "ready_to_send",
      },
    });

    const user = userEvent.setup();
    render(<FinalCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Run final check" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runFinalCheckActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("shows a validation error without refreshing when the check runs but fails validation", async () => {
    runFinalCheckActionMock.mockResolvedValue({
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
    render(<FinalCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />);

    await user.click(screen.getByRole("button", { name: "Run final check" }));

    await waitFor(() => {
      expect(screen.getByText("bad JSON")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("renders a ready_to_send result fetched from the latest final_check_json artifact", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          final_decision: "ready_to_send",
          quality_score: 92,
          page_count: 1,
          missing_sections: [],
          formatting_issues: [],
          overclaiming_issues: [],
          broken_links: [],
          warnings: [],
          final_checklist: CHECKLIST,
        }),
    } as Response);

    render(
      <FinalCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[makeArtifact()]} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("ready_to_send — quality score: 92 — 1 page"),
      ).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/artifacts/artifact-json-1/download");
  });

  it("renders a needs_edit result with visible issues", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          final_decision: "needs_edit",
          quality_score: 65,
          page_count: 2,
          missing_sections: ["Certifications"],
          formatting_issues: ["Inconsistent bullet spacing"],
          overclaiming_issues: [],
          broken_links: [],
          warnings: ["Check contact email"],
          final_checklist: { ...CHECKLIST, ready_to_apply: false },
        }),
    } as Response);

    render(
      <FinalCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[makeArtifact()]} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("needs_edit — quality score: 65 — 2 pages"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Certifications")).toBeInTheDocument();
    expect(screen.getByText("Inconsistent bullet spacing")).toBeInTheDocument();
    expect(screen.getByText("Check contact email")).toBeInTheDocument();
  });

  it("renders a do_not_send result distinctly from the other decisions", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          final_decision: "do_not_send",
          quality_score: 30,
          page_count: 3,
          missing_sections: [],
          formatting_issues: [],
          overclaiming_issues: ["Claims senior AWS production experience with no evidence"],
          broken_links: ["https://broken.example/portfolio"],
          warnings: [],
          final_checklist: { ...CHECKLIST, no_unsupported_claims: false },
        }),
    } as Response);

    render(
      <FinalCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[makeArtifact()]} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("do_not_send — quality score: 30 — 3 pages"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Claims senior AWS production experience with no evidence"),
    ).toBeInTheDocument();
    expect(screen.getByText("https://broken.example/portfolio")).toBeInTheDocument();
    expect(
      screen.queryByText("ready_to_send — quality score: 30 — 3 pages"),
    ).not.toBeInTheDocument();
  });
});
