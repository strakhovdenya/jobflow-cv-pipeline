import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceList, ALL_WORKSPACE_STATUSES, relativeDate, statusCategory } from "./workspace-list";
import type { WorkspaceListItem } from "@/lib/api";

function makeWorkspace(overrides: Partial<WorkspaceListItem> = {}): WorkspaceListItem {
  return {
    id: "wf_1",
    status: "source_saved",
    currentDecision: null,
    originalDecision: null,
    workspaceSlug: "2026_07_21_Hired_Fullstack_Developer",
    createdAt: "2026-07-21T09:02:00Z",
    updatedAt: "2026-07-21T09:02:00Z",
    score: null,
    analysisStrategy: "legacy",
    forkedFromWorkspaceId: null,
    comparisonGroupId: null,
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

  it("renders a copy link button when the vacancy has a source url", () => {
    render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({
            jobVacancy: {
              id: "jv_1",
              roleTitleOriginal: "Fullstack Developer",
              roleSlug: "fullstack_developer",
              sourceUrl: "https://example.com/job",
            },
          }),
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy vacancy link" })).toBeInTheDocument();
  });

  it("omits the copy link button when the source url is null", () => {
    render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({
            jobVacancy: {
              id: "jv_1",
              roleTitleOriginal: "Fullstack Developer",
              roleSlug: "fullstack_developer",
              sourceUrl: null,
            },
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy vacancy link" })).not.toBeInTheDocument();
  });

  it("omits the copy link button when the source url is empty", () => {
    render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({
            jobVacancy: {
              id: "jv_1",
              roleTitleOriginal: "Fullstack Developer",
              roleSlug: "fullstack_developer",
              sourceUrl: "",
            },
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Copy vacancy link" })).not.toBeInTheDocument();
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

const badgeTexts = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-strategy-badge]")].map((element) => element.textContent);

describe("WorkspaceList strategy badge (ISSUE-717)", () => {
  const groupId = "wf_source";
  const source = makeWorkspace({ id: "wf_source", analysisStrategy: "legacy", comparisonGroupId: groupId });
  const forkOf = (id: string, analysisStrategy: WorkspaceListItem["analysisStrategy"]) =>
    makeWorkspace({ id, analysisStrategy, comparisonGroupId: groupId, forkedFromWorkspaceId: groupId });

  it("labels comparison workspaces by strategy and marks the source", () => {
    render(
      <WorkspaceList
        workspaces={[forkOf("wf_c", "c"), forkOf("wf_b", "b"), forkOf("wf_l", "legacy"), source]}
      />,
    );

    expect(screen.getByText("Source · Legacy")).toBeInTheDocument();
    expect(screen.getByText("Strategy B")).toBeInTheDocument();
    expect(screen.getByText("Strategy C")).toBeInTheDocument();
    // the Legacy fork and the Legacy source are told apart
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.getByText("Source · Legacy")).not.toBe(screen.getByText("Legacy"));
    expect(screen.getByText("Source · Legacy")).toHaveAttribute(
      "title",
      "Original workspace of a strategy comparison",
    );
    expect(screen.getByText("Strategy B")).toHaveAttribute("title", "Fork made for a strategy comparison");

    // a source is labelled from its own strategy, not assumed to be legacy
    cleanup();
    render(
      <WorkspaceList
        workspaces={[makeWorkspace({ id: "wf_s2", analysisStrategy: "c", comparisonGroupId: "wf_s2" })]}
      />,
    );
    expect(screen.getByText("Source · Strategy C")).toBeInTheDocument();

    // the badge sits next to the company name, outside the link
    const company = screen.getByRole("link", { name: "Hired" });
    expect(company.textContent).toBe("Hired");
    expect(company.nextElementSibling).toBe(screen.getByText("Source · Strategy C"));
  });

  it("keeps a standalone legacy row unchanged", () => {
    const standalone = makeWorkspace({
      id: "wf_alone",
      status: "paused_after_analysis",
      currentDecision: "apply",
      score: 75,
    });
    const { container: withFields } = render(<WorkspaceList workspaces={[standalone]} />);
    const before = withFields.innerHTML;
    cleanup();

    const withoutFields = { ...standalone } as Partial<WorkspaceListItem>;
    delete withoutFields.analysisStrategy;
    delete withoutFields.forkedFromWorkspaceId;
    delete withoutFields.comparisonGroupId;
    const { container } = render(<WorkspaceList workspaces={[withoutFields as WorkspaceListItem]} />);

    expect(container.innerHTML).toBe(before);
    expect(badgeTexts(container)).toEqual([]);
    expect(container.querySelector("[title*='comparison']")).toBeNull();
  });

  it("ignores the slug, score and decision when labelling", () => {
    const { container } = render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({ id: "wf_1", workspaceSlug: "2026_11_27_Acme_Role_fork_3", score: 61, currentDecision: "maybe" }),
          makeWorkspace({ id: "wf_2", workspaceSlug: "2026_11_27_Acme_strategy_b", score: 67, currentDecision: "skip" }),
          forkOf("wf_3", "b"),
        ]}
      />,
    );
    // only the workspace whose API fields say so is labelled
    expect(badgeTexts(container)).toEqual(["Strategy B"]);
  });

  it("shows no badge for a missing or unknown strategy", () => {
    const unknown = makeWorkspace({ id: "wf_u", comparisonGroupId: groupId, forkedFromWorkspaceId: groupId });
    (unknown as unknown as { analysisStrategy: unknown }).analysisStrategy = "future_strategy";
    const prototypeKey = makeWorkspace({ id: "wf_p", comparisonGroupId: groupId });
    (prototypeKey as unknown as { analysisStrategy: unknown }).analysisStrategy = "constructor";
    const missing = { ...makeWorkspace({ id: "wf_m", comparisonGroupId: groupId }) } as Partial<WorkspaceListItem>;
    delete missing.analysisStrategy;
    const nullish = makeWorkspace({ id: "wf_n", comparisonGroupId: groupId });
    (nullish as unknown as { analysisStrategy: unknown }).analysisStrategy = null;

    let container: HTMLElement | undefined;
    expect(() => {
      container = render(
        <WorkspaceList workspaces={[unknown, prototypeKey, missing as WorkspaceListItem, nullish]} />,
      ).container;
    }).not.toThrow();
    expect(badgeTexts(container as HTMLElement)).toEqual([]);
    expect(screen.getAllByRole("link", { name: "Hired" })).toHaveLength(4);
  });

  it("shows the strategy of a non-legacy workspace without a group", () => {
    const { container } = render(
      <WorkspaceList
        workspaces={[
          makeWorkspace({ id: "wf_b", analysisStrategy: "b" }),
          makeWorkspace({
            id: "wf_c",
            analysisStrategy: "c",
            company: { id: "co_2", nameOriginal: "Coral", companySlug: "coral" },
          }),
        ]}
      />,
    );
    expect(badgeTexts(container)).toEqual(["Strategy B", "Strategy C"]);
    // no group, so neither is called a source or a fork
    expect(screen.getByText("Strategy B")).not.toHaveAttribute("title");
  });
});
