import Link from "next/link";
import type { WorkspaceListItem } from "@/lib/api";
import { statusLabel } from "@/lib/pipeline-view-model";

export type StatusCategory = "needsReview" | "inProgress" | "positive" | "neutral" | "failed";

/**
 * Color category per real WorkspaceStatus value (apps/api/prisma/schema.prisma, 19 values).
 * Not derived from statusLabel()/pipeline-view-model.ts, which has no color concept — this is a
 * separate, list-screen-only mapping (docs/mockups/14-workspaces-list.html only covers 11 of the
 * 19 real values, so the rest are extrapolated by category, not copied from the mockup).
 */
const STATUS_CATEGORY: Record<string, StatusCategory> = {
  source_saved: "inProgress",
  analysis_running: "inProgress",
  analysis_ready: "inProgress",
  paused_after_analysis: "needsReview",
  skipped: "neutral",
  cv_generation_running: "inProgress",
  cv_draft_ready: "inProgress",
  paused_after_cv_draft: "needsReview",
  pre_pdf_check_ready: "inProgress",
  paused_before_export: "needsReview",
  export_running: "inProgress",
  cv_pdf_generated: "positive",
  final_check_ready: "positive",
  cover_letter_generated: "positive",
  ready_to_apply: "positive",
  applied: "positive",
  rejected: "neutral",
  archived: "neutral",
  failed: "failed",
};

const CATEGORY_PILL_CLASS: Record<StatusCategory, string> = {
  needsReview: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  inProgress: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  positive: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  neutral: "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function statusCategory(status: string): StatusCategory {
  return STATUS_CATEGORY[status] ?? "inProgress";
}

function isNeedsReview(status: string): boolean {
  return status.startsWith("paused_");
}

const DECISION_CLASS: Record<string, string> = {
  apply: "text-green-700 dark:text-green-400",
  maybe: "text-amber-700 dark:text-amber-400",
  skip: "text-zinc-400 dark:text-zinc-500",
};

function decisionLabel(decision: string | null): string {
  return decision ?? "—";
}

function decisionClassName(decision: string | null): string {
  if (decision === null) {
    return "text-zinc-300 dark:text-zinc-600";
  }
  return DECISION_CLASS[decision] ?? "text-zinc-500 dark:text-zinc-400";
}

export function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) {
    return "just now";
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return new Date(iso).toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

interface WorkspaceListProps {
  workspaces: WorkspaceListItem[];
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-lg text-zinc-400 dark:border-zinc-700">
          +
        </span>
        <p className="text-sm font-semibold text-black dark:text-zinc-50">No workspaces yet</p>
        <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
          Create a workspace from a job posting to start tracking it through the pipeline.
        </p>
        <Link
          href="/workspaces/new"
          className="mt-1 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          New workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="grid grid-cols-[1.6fr_1.7fr_1.3fr_0.8fr_0.9fr] gap-3 bg-zinc-100 px-4 py-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
        <span>Company / Role</span>
        <span>Status</span>
        <span>Decision</span>
        <span>Score</span>
        <span className="text-right">Updated</span>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {workspaces.map((workspace) => {
          const needsReview = isNeedsReview(workspace.status);
          const category = statusCategory(workspace.status);

          return (
            <div
              key={workspace.id}
              className={`grid grid-cols-[1.6fr_1.7fr_1.3fr_0.8fr_0.9fr] items-center gap-3 px-4 py-3 ${
                needsReview ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {needsReview && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600"
                      title="Needs review"
                    />
                  )}
                  <Link
                    href={`/workspaces/${workspace.id}`}
                    className="truncate text-sm font-bold text-black underline decoration-transparent dark:text-zinc-50"
                  >
                    {workspace.company.nameOriginal}
                  </Link>
                </div>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {workspace.jobVacancy.roleTitleOriginal}
                </p>
                <p className="truncate font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
                  {workspace.workspaceSlug}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${CATEGORY_PILL_CLASS[category]}`}
                >
                  ● {statusLabel(workspace.status)}
                </span>
                {needsReview && (
                  <p className="mt-1 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                    needs review
                  </p>
                )}
              </div>
              <span className={`font-mono text-xs ${decisionClassName(workspace.currentDecision)}`}>
                {decisionLabel(workspace.currentDecision)}
              </span>
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                {workspace.score != null ? workspace.score : "—"}
              </span>
              <span className="text-right font-mono text-xs text-zinc-400 dark:text-zinc-600">
                {relativeDate(workspace.updatedAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
