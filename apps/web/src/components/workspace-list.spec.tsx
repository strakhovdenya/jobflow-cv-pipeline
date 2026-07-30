import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceList, relativeDate, statusCategory } from "./workspace-list";
import type { WorkspaceListItem } from "@/lib/api";

const ALL_WORKSPACE_STATUSES = [
  "source_saved",
  "analysis_running",
  "analysis_ready",
  "paused_after_analysis",
  "skipped",
  "cv_generation_running",
  "cv_draft_ready",
  "paused_after_cv_draft",
  "pre_pdf_check_ready",
  "paused_before_export",
  "export_running",
  "cv_pdf_generated",
  "final_check_ready",
  "ready_to_apply",
  "cover_letter_generated",
  "applied",
  "rejected",
  "archived",
  "failed",
];

function makeWorkspace(overrides: Partial<WorkspaceListItem> = {}): WorkspaceListItem {
  return {
    id: "wf_1",
    status: "source_saved",
    currentDecision: null,
    workspaceSlug: "2026_07_21_Hired_Fullstack_Developer",
    createdAt: "2026-07-21T09:02:00Z",
    updatedAt: "2026-07-21T09:02:00Z",
    score: null,
    company: { id: "co_1", nameOriginal: "Hired", companySlug: "hired" },
    jobVacancy: { id: "jv_1", roleTitleOriginal: "Fullstack Developer", roleSlug: "fullstack_developer" },
    ...overrides,
  };
}

describe("WorkspaceList", () => {
  it("renders the empty state when there are no workspaces", () => {
    render(<WorkspaceList workspaces={[]} />);

    expect(screen.getByText("No workspaces yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New workspace" })).toHaveAttribute(
      "href",
      "/workspaces/new",
    );
  });

  it("renders a populated list with company/role/status/decision/score/date", () => {
    const workspaces: WorkspaceListItem[] = [
      makeWorkspace({
        id: "wf_1",
        status: "cv_pdf_generated",
        currentDecision: "apply",
        score: 75,
      }),
      makeWorkspace({
        id: "wf_2",
        status: "skipped",
        currentDecision: "skip",
        score: 41,
        company: { id: "co_2", nameOriginal: "Coral Health", companySlug: "coral_health" },
        jobVacancy: { id: "jv_2", roleTitleOriginal: "Frontend Engineer", roleSlug: "frontend_engineer" },
      }),
    ];
    render(<WorkspaceList workspaces={workspaces} />);

    expect(screen.getByRole("link", { name: "Hired" })).toHaveAttribute("href", "/workspaces/wf_1");
    expect(screen.getByText("Fullstack Developer")).toBeInTheDocument();
    expect(screen.getByText("● PDF generated")).toBeInTheDocument();
    expect(screen.getByText("apply")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Coral Health" })).toHaveAttribute(
      "href",
      "/workspaces/wf_2",
    );
    expect(screen.getByText("● Skipped")).toBeInTheDocument();
    expect(screen.getByText("skip")).toBeInTheDocument();
  });

  it("renders a null score as an em dash", () => {
    render(<WorkspaceList workspaces={[makeWorkspace({ score: null, currentDecision: "apply" })]} />);

    expect(screen.getByText("—", { selector: "span.font-mono" })).toBeInTheDocument();
  });

  it.each(["paused_after_analysis", "paused_after_cv_draft", "paused_before_export"])(
    "marks %s as needing review",
    (status) => {
      render(<WorkspaceList workspaces={[makeWorkspace({ status })]} />);

      expect(screen.getByText("needs review")).toBeInTheDocument();
      expect(screen.getByTitle("Needs review")).toBeInTheDocument();
    },
  );

  it.each(["source_saved", "cv_generation_running", "cv_pdf_generated", "skipped", "failed"])(
    "does not mark %s as needing review",
    (status) => {
      render(<WorkspaceList workspaces={[makeWorkspace({ status })]} />);

      expect(screen.queryByText("needs review")).not.toBeInTheDocument();
    },
  );

  it("colors decisions: apply green, maybe amber, skip gray, null muted dash", () => {
    render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({ id: "wf_1", currentDecision: "apply", score: 75 }),
          makeWorkspace({ id: "wf_2", currentDecision: "maybe", score: 60 }),
          makeWorkspace({ id: "wf_3", currentDecision: "skip", score: 41 }),
          makeWorkspace({ id: "wf_4", currentDecision: null, score: 50 }),
        ]}
      />,
    );

    expect(screen.getByText("apply")).toHaveClass("text-green-700");
    expect(screen.getByText("maybe")).toHaveClass("text-amber-700");
    expect(screen.getByText("skip")).toHaveClass("text-zinc-400");
    expect(screen.getByText("—", { selector: "span.font-mono" })).toHaveClass("text-zinc-300");
  });

  it("gives every real WorkspaceStatus value a defined label and color category", () => {
    for (const status of ALL_WORKSPACE_STATUSES) {
      const category = statusCategory(status);
      expect(["needsReview", "inProgress", "positive", "neutral", "failed"]).toContain(category);

      const { unmount, queryByText } = render(
        <WorkspaceList workspaces={[makeWorkspace({ id: status, status })]} />,
      );
      // Every status must render a non-empty, non-raw-enum label (i.e. statusLabel() covers it).
      expect(queryByText(status)).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("relativeDate", () => {
  it("renders 'just now' for a timestamp under an hour old", () => {
    expect(relativeDate(new Date().toISOString())).toBe("just now");
  });

  it("renders hours-ago for a timestamp within the last day", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(relativeDate(twoHoursAgo)).toBe("2h ago");
  });

  it("renders a short date for a timestamp older than a day", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 3_600_000);
    const result = relativeDate(fiveDaysAgo.toISOString());
    expect(result).not.toMatch(/ago|now/);
  });
});
