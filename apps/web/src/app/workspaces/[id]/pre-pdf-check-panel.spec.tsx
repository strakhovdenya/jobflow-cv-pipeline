import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isFieldPathUserForced,
  PrePdfCheckPanel,
  type CvContentForForcedCheck,
} from "./pre-pdf-check-panel";
import {
  generateCvContentAction,
  runPrePdfCheckAction,
  skipPrePdfCheckAction,
} from "./actions";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("./actions", () => ({
  runPrePdfCheckAction: vi.fn(),
  skipPrePdfCheckAction: vi.fn(),
  generateCvContentAction: vi.fn(),
}));

const runPrePdfCheckActionMock = vi.mocked(runPrePdfCheckAction);
const skipPrePdfCheckActionMock = vi.mocked(skipPrePdfCheckAction);
const generateCvContentActionMock = vi.mocked(generateCvContentAction);

function makeArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "artifact-json-1",
    artifactType: "pre_pdf_check_json",
    canonicalFileName: "03_pre_pdf_check.json",
    downloadFileName: "PRECHECK_acme_dev.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 123,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

function makeCvContentArtifact(
  overrides: Partial<WorkspaceArtifactSummary> = {},
): WorkspaceArtifactSummary {
  return {
    id: "cv-content-1",
    artifactType: "targeted_cv_content_json",
    canonicalFileName: "02_targeted_cv_content.json",
    downloadFileName: "cv_content.json",
    isLatest: true,
    version: 1,
    mimeType: "application/json",
    fileSizeBytes: 456,
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

// ─── isFieldPathUserForced ────────────────────────────────────────────────────

describe("isFieldPathUserForced", () => {
  const base: CvContentForForcedCheck = {
    current_work_block: { bullets: [{ user_forced: true }, { user_forced: false }] },
    experience: [
      { bullets: [{ user_forced: false }, { user_forced: true }] },
      { bullets: [{ user_forced: true }] },
    ],
    selected_projects: [
      { bullets: [{ user_forced: true }] },
      { bullets: [{}] },
    ],
  };

  it("returns false for non-bullet paths (headline, summary[N], stable_intro)", () => {
    expect(isFieldPathUserForced("headline", base)).toBe(false);
    expect(isFieldPathUserForced("summary[0]", base)).toBe(false);
    expect(isFieldPathUserForced("current_work_block.stable_intro", base)).toBe(false);
  });

  it("returns true for current_work_block.bullets[N].text when user_forced is true", () => {
    expect(isFieldPathUserForced("current_work_block.bullets[0].text", base)).toBe(true);
  });

  it("returns false for current_work_block.bullets[N].text when user_forced is false", () => {
    expect(isFieldPathUserForced("current_work_block.bullets[1].text", base)).toBe(false);
  });

  it("returns false for out-of-bounds current_work_block bullet index", () => {
    expect(isFieldPathUserForced("current_work_block.bullets[99].text", base)).toBe(false);
  });

  it("returns true for experience[N].bullets[M].text when user_forced is true", () => {
    expect(isFieldPathUserForced("experience[0].bullets[1].text", base)).toBe(true);
    expect(isFieldPathUserForced("experience[1].bullets[0].text", base)).toBe(true);
  });

  it("returns false for experience[N].bullets[M].text when user_forced is false/undefined", () => {
    expect(isFieldPathUserForced("experience[0].bullets[0].text", base)).toBe(false);
    expect(isFieldPathUserForced("experience[1].bullets[99].text", base)).toBe(false);
  });

  it("returns true for selected_projects[N].bullets[M].text when user_forced is true", () => {
    expect(isFieldPathUserForced("selected_projects[0].bullets[0].text", base)).toBe(true);
  });

  it("returns false for selected_projects[N].bullets[M].text when user_forced is false/undefined", () => {
    // second project's bullet has no user_forced key → undefined → not true
    expect(isFieldPathUserForced("selected_projects[1].bullets[0].text", base)).toBe(false);
    expect(isFieldPathUserForced("selected_projects[0].bullets[99].text", base)).toBe(false);
  });

  it("returns false for paths that look like bullets but don't match the full pattern", () => {
    // field_path is relative to cv_content; wrapper key must not be present
    expect(isFieldPathUserForced("cv_content.experience[0].bullets[1].text", base)).toBe(
      false,
    );
    // partial match: missing .text suffix
    expect(isFieldPathUserForced("experience[0].bullets[1]", base)).toBe(false);
  });

  it("generalizes to a bullet-bearing field not hardcoded by name (future schema evolution)", () => {
    // Not one of current_work_block/experience/selected_projects — proves the check is a
    // generic path-walk, not a name-specific regex allowlist (would silently miss this
    // otherwise, per ADR-034's "never treat forced content as ordinary" requirement).
    const withFutureField: CvContentForForcedCheck = {
      ...base,
      certifications: [{ bullets: [{ user_forced: true }] }],
    };
    expect(
      isFieldPathUserForced("certifications[0].bullets[0].text", withFutureField),
    ).toBe(true);
  });
});

// ─── PrePdfCheckPanel component ───────────────────────────────────────────────

describe("PrePdfCheckPanel", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    runPrePdfCheckActionMock.mockReset();
    skipPrePdfCheckActionMock.mockReset();
    generateCvContentActionMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing outside pre_pdf_check_ready/paused_before_export", () => {
    const { container } = render(
      <PrePdfCheckPanel workspaceId="ws-1" status="cv_pdf_generated" artifacts={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing at cv_draft_ready/paused_after_cv_draft — check is not runnable before Approve", () => {
    const { container: cvDraftReady } = render(
      <PrePdfCheckPanel workspaceId="ws-1" status="cv_draft_ready" artifacts={[]} />,
    );
    expect(cvDraftReady).toBeEmptyDOMElement();

    const { container: pausedAfterCvDraft } = render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_after_cv_draft"
        artifacts={[]}
      />,
    );
    expect(pausedAfterCvDraft).toBeEmptyDOMElement();
  });

  it("shows the trigger and skip buttons and calls the action, then refreshes on success", async () => {
    runPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: { success: true, promptRunId: "run-1", aiRunId: "ai-1", readiness: "ready" },
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />,
    );

    expect(screen.getByRole("button", { name: "Skip pre-PDF check" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run pre-PDF check" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(runPrePdfCheckActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("shows a validation error without refreshing when the check runs but fails validation", async () => {
    runPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: {
        success: false,
        promptRunId: "run-1",
        aiRunId: "ai-1",
        validationError: "bad JSON",
      },
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />,
    );

    await user.click(screen.getByRole("button", { name: "Run pre-PDF check" }));

    await waitFor(() => {
      expect(screen.getByText("bad JSON")).toBeInTheDocument();
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("calls skipPrePdfCheckAction and refreshes on success", async () => {
    skipPrePdfCheckActionMock.mockResolvedValue({
      ok: true,
      data: { workspaceId: "ws-1", status: "paused_before_export" },
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel workspaceId="ws-1" status="pre_pdf_check_ready" artifacts={[]} />,
    );

    await user.click(screen.getByRole("button", { name: "Skip pre-PDF check" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(skipPrePdfCheckActionMock).toHaveBeenCalledWith("ws-1");
  });

  it("hides the Run/Skip buttons once past the gate, at paused_before_export", () => {
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Run pre-PDF check" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Skip pre-PDF check" }),
    ).not.toBeInTheDocument();
  });

  it("renders a passing result fetched from the latest pre_pdf_check_json artifact", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          readiness: "ready",
          corrections: [],
          export_blocked: false,
          overall_notes: "Looks good.",
        }),
    } as Response);

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Export allowed — readiness: ready")).toBeInTheDocument();
    });
    expect(screen.getByText("No corrections suggested.")).toBeInTheDocument();
    expect(screen.getByText(/Looks good\./)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/artifacts/artifact-json-1/download");
    expect(screen.getByText("Results").closest("details")).not.toHaveAttribute("open");
  });

  it("renders a blocked result distinctly from a passing result", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          readiness: "not_ready",
          corrections: [
            {
              field_path: "summary[0]",
              suggested_text: "Rewrite this claim.",
              severity: "critical",
              reason: "Overclaiming detected.",
            },
          ],
          export_blocked: true,
          overall_notes: "Fix before exporting.",
        }),
    } as Response);

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Export blocked — readiness: not_ready"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("summary[0]")).toBeInTheDocument();
    expect(screen.getByText("Overclaiming detected.")).toBeInTheDocument();
    expect(
      screen.queryByText("Export allowed — readiness: not_ready"),
    ).not.toBeInTheDocument();
  });

  // ─── Checkbox and Regenerate ────────────────────────────────────────────────

  it("renders checkboxes for selectable corrections and the Regenerate button", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
              ],
              export_blocked: false,
              overall_notes: "Minor edits suggested.",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{}] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Export allowed — readiness: ready_with_minor_edits")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Regenerate CV draft with selected feedback",
      }),
    ).toBeInTheDocument();
  });

  it("Regenerate button is disabled initially; enabled after selecting a correction", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
              ],
              export_blocked: false,
              overall_notes: "Minor edits.",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{}] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Regenerate CV draft with selected feedback",
        }),
      ).toBeDisabled();
    });

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "Regenerate CV draft with selected feedback",
      }),
    ).not.toBeDisabled();
  });

  it("shows no checkboxes while cv content is still loading (fail closed, ADR-034), then reveals only the non-forced correction once it resolves", async () => {
    // Two corrections: A (will turn out forced) and B (not forced). Fail-closed means neither
    // is selectable — no checkbox for either — until cv content has successfully loaded.
    let resolveCvContent!: (data: unknown) => void;
    const cvContentDeferred = new Promise<Response>((resolve) => {
      resolveCvContent = (data) =>
        resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
                {
                  field_path: "summary[0]",
                  suggested_text: "Good summary.",
                  severity: "suggestion",
                  reason: "Too vague.",
                },
              ],
              export_blocked: false,
              overall_notes: "",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return cvContentDeferred;
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    // Wait for pre-pdf-check JSON to load. cv content is still pending — fail-closed means no
    // checkbox for EITHER correction yet, and the whole Regenerate section stays hidden.
    await waitFor(() => {
      expect(
        screen.getByText("Export allowed — readiness: ready_with_minor_edits"),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Select correction: summary[0]" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    ).not.toBeInTheDocument();

    // Resolve cv content revealing that correction A's bullet is user_forced
    resolveCvContent({
      cv_content: {
        current_work_block: { bullets: [] },
        experience: [{ bullets: [{ user_forced: true }] }],
        selected_projects: [],
      },
    });

    // Now correction A stays unselectable (forced), correction B (summary[0]) becomes selectable
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    ).not.toBeInTheDocument();

    // Regenerate button exists now but is disabled — summary[0] is selectable but not yet selected
    expect(
      screen.getByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
    );
    expect(
      screen.getByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    ).not.toBeDisabled();
  });

  it("regenerateWithFeedback excludes forced paths from notes even when mixed with selectable selections", async () => {
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: {} });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Forced text.",
                  severity: "warning",
                  reason: "Forced reason.",
                },
                {
                  field_path: "summary[0]",
                  suggested_text: "Good summary.",
                  severity: "suggestion",
                  reason: "Too vague.",
                },
              ],
              export_blocked: false,
              overall_notes: "",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{ user_forced: true }] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    // Only the non-forced correction ever gets a checkbox (fail-closed, ADR-034) — the forced
    // one's checkbox never appears at all, so there's nothing to accidentally select.
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
    );
    expect(
      screen.getByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    ).not.toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    );

    await waitFor(() => {
      expect(generateCvContentActionMock).toHaveBeenCalled();
    });

    const [, notes] = generateCvContentActionMock.mock.calls[0];
    // Forced path must NOT appear in notes (ADR-034)
    expect(notes).not.toContain("experience[0].bullets[0].text");
    expect(notes).not.toContain("Forced reason.");
    // Non-forced path MUST appear in notes
    expect(notes).toContain("summary[0]");
    expect(notes).toContain("Too vague.");
  });

  it("clicking Regenerate calls generateCvContentAction with selected findings as notes", async () => {
    generateCvContentActionMock.mockResolvedValue({ ok: true, data: {} });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
                {
                  field_path: "summary[0]",
                  suggested_text: "Better summary.",
                  severity: "suggestion",
                  reason: "Too vague.",
                },
              ],
              export_blocked: false,
              overall_notes: "Minor edits.",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{}] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", {
          name: "Select correction: experience[0].bullets[0].text",
        }),
      ).toBeInTheDocument();
    });

    // Select only the first correction
    await user.click(
      screen.getByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Regenerate CV draft with selected feedback",
      }),
    );

    await waitFor(() => {
      expect(generateCvContentActionMock).toHaveBeenCalledWith(
        "ws-1",
        expect.stringContaining("experience[0].bullets[0].text"),
      );
    });
    // The second correction should NOT appear in the notes since it was not selected
    const [, notes] = generateCvContentActionMock.mock.calls[0];
    expect(notes).not.toContain("summary[0]");
    expect(notes).toContain("Weak phrasing");
    expect(notes).toContain("Revised text.");
  });

  it("excludes user_forced corrections from the checkbox list", async () => {
    // Fetch mock that distinguishes the two artifact downloads by URL
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  // This bullet IS user_forced in the cv content
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
                {
                  // This path is not a bullet path — always selectable
                  field_path: "summary[0]",
                  suggested_text: "Better summary.",
                  severity: "suggestion",
                  reason: "Too vague.",
                },
              ],
              export_blocked: false,
              overall_notes: "Check findings.",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{ user_forced: true }] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    // Wait for both fetches to resolve and the UI to update
    await waitFor(() => {
      expect(
        screen.getByText("Export allowed — readiness: ready_with_minor_edits"),
      ).toBeInTheDocument();
    });

    // The user_forced bullet's correction has NO checkbox
    await waitFor(() => {
      expect(
        screen.queryByRole("checkbox", {
          name: "Select correction: experience[0].bullets[0].text",
        }),
      ).not.toBeInTheDocument();
    });

    // The non-bullet correction (summary[0]) still has a checkbox
    expect(
      screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
    ).toBeInTheDocument();
  });

  it("counter uses selectedSelectableCount — only counts the non-forced, actually-selected correction", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
                {
                  field_path: "summary[0]",
                  suggested_text: "Better.",
                  severity: "suggestion",
                  reason: "Too vague.",
                },
              ],
              export_blocked: false,
              overall_notes: "",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cv_content: {
                current_work_block: { bullets: [] },
                experience: [{ bullets: [{ user_forced: true }] }],
                selected_projects: [],
              },
            }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const user = userEvent.setup();
    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    // Correction A (forced) never gets a checkbox; only B (summary[0]) does.
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/finding.*selected/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: "Select correction: summary[0]" }),
    );

    expect(screen.getByText("1 finding selected")).toBeInTheDocument();
  });

  it("shows a warning when cv content fetch fails; no corrections are selectable (fail-closed, ADR-034)", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("artifact-json-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              readiness: "ready_with_minor_edits",
              corrections: [
                {
                  field_path: "experience[0].bullets[0].text",
                  suggested_text: "Revised text.",
                  severity: "warning",
                  reason: "Weak phrasing.",
                },
              ],
              export_blocked: false,
              overall_notes: "",
            }),
        } as Response);
      }
      if (urlStr.includes("cv-content-1")) {
        return Promise.resolve({ ok: false, status: 500 } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact(), makeCvContentArtifact()]}
      />,
    );

    // Warning message about failed cv content fetch must be visible
    await waitFor(() => {
      expect(
        screen.getByText(/Could not load CV content for forced-finding detection/),
      ).toBeInTheDocument();
    });

    // No checkbox and no Regenerate button — fail-closed, nothing is selectable
    expect(
      screen.queryByRole("checkbox", {
        name: "Select correction: experience[0].bullets[0].text",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Regenerate CV draft with selected feedback" }),
    ).not.toBeInTheDocument();
  });

  it("hides the Regenerate section when no corrections exist", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          readiness: "ready",
          corrections: [],
          export_blocked: false,
          overall_notes: "Looks good.",
        }),
    } as Response);

    render(
      <PrePdfCheckPanel
        workspaceId="ws-1"
        status="paused_before_export"
        artifacts={[makeArtifact()]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No corrections suggested.")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", {
        name: "Regenerate CV draft with selected feedback",
      }),
    ).not.toBeInTheDocument();
  });
});
