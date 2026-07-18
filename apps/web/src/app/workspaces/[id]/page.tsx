import { notFound } from "next/navigation";
import { getWorkspace, NotFoundApiError } from "@/lib/api";
import { AnalysisReviewGate } from "./analysis-review-gate";
import { CvDraftReviewGate } from "./cv-draft-review-gate";

const NEXT_ACTION_BY_STATUS: Record<string, string> = {
  source_saved: "Start analysis (run-analysis)",
  analysis_running: "Waiting for analysis to complete",
  paused_after_analysis: "Review the analysis result and decide apply/maybe/skip/pause",
  skipped: "Override the skip decision if this vacancy should be reconsidered",
  cv_generation_running: "Waiting for CV draft generation to complete",
  cv_draft_ready: "Review the CV draft and decide approve/pause",
  paused_after_cv_draft: "Review the CV draft and decide approve/pause/regenerate",
  export_running: "Waiting for PDF export to complete",
  cv_pdf_generated: "Download the generated CV / proceed to next steps",
  failed: "A pipeline step failed — check logs and retry",
};

function nextActionLabel(status: string): string {
  return NEXT_ACTION_BY_STATUS[status] ?? "No action defined for this status";
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let workspace;
  try {
    workspace = await getWorkspace(id);
  } catch (error) {
    if (error instanceof NotFoundApiError) {
      notFound();
    }
    throw error;
  }

  const showAnalysisGate =
    workspace.status === "paused_after_analysis" || workspace.status === "skipped";
  const showCvDraftGate =
    workspace.status === "cv_draft_ready" || workspace.status === "paused_after_cv_draft";

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          {workspace.company.nameOriginal} — {workspace.jobVacancy.roleTitleOriginal}
        </h1>
        <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
          {workspace.workspaceSlug}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Status</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">{workspace.status}</dd>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Decision</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            {workspace.currentDecision ?? "—"}
          </dd>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Review state</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            {workspace.reviewState ?? "—"}
          </dd>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Score</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            {workspace.score ?? "—"}
          </dd>
          <dt className="font-medium text-zinc-500 dark:text-zinc-400">Next action</dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            {nextActionLabel(workspace.status)}
          </dd>
          {workspace.skipReasonSummary && (
            <>
              <dt className="font-medium text-zinc-500 dark:text-zinc-400">
                Skip reason
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {workspace.skipReasonSummary}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Artifacts
        </h2>
        {workspace.artifacts.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No artifacts yet.
          </p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="py-1 font-medium">Type</th>
                <th className="py-1 font-medium">File</th>
                <th className="py-1 font-medium">Version</th>
                <th className="py-1 font-medium">Latest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workspace.artifacts.map((artifact) => (
                <tr key={artifact.id}>
                  <td className="py-1">{artifact.artifactType}</td>
                  <td className="break-all py-1 font-mono text-xs">
                    {artifact.downloadFileName}
                  </td>
                  <td className="py-1">{artifact.version}</td>
                  <td className="py-1">{artifact.isLatest ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {showAnalysisGate && (
        <AnalysisReviewGate
          workspaceId={workspace.id}
          status={workspace.status}
          currentDecision={workspace.currentDecision}
        />
      )}

      {showCvDraftGate && <CvDraftReviewGate workspaceId={workspace.id} />}
    </div>
  );
}
