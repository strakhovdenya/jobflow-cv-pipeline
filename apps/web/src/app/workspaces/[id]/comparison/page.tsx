import Link from "next/link";
import { ApiValidationError, getComparison, type ComparisonSummary } from "@/lib/api";
import { ROWS_PARAM, decodeRowNotes } from "../compare-strategies";
import { ComparisonTable } from "./comparison-table";

// ISSUE-717: the strategy comparison of a workspace's fork group (ADR-046 item 8). Read only — the
// summary comes from `GET /workspaces/:id/comparison`; the failed fork rows of the compare run that
// sent the owner here arrive in the `rows` parameter (untrusted, validated by `decodeRowNotes`).
export default async function WorkspaceComparisonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const notes = decodeRowNotes((await searchParams)[ROWS_PARAM]);

  let summary: ComparisonSummary | null = null;
  let loadError: string | null = null;
  try {
    summary = await getComparison(id);
  } catch (error) {
    loadError =
      error instanceof ApiValidationError
        ? error.messages.join("; ")
        : "The backend could not be reached.";
  }

  const requested = summary?.members.find((member) => member.isRequested) ?? null;

  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-7xl flex-col gap-6 bg-zinc-50 px-4 py-10 font-sans sm:px-6 dark:bg-black">
      <div className="flex flex-col gap-1">
        <Link
          href={`/workspaces/${encodeURIComponent(id)}`}
          className="w-fit text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300"
        >
          ← Back to workspace
        </Link>
        <h1 className="text-xl font-bold text-black dark:text-zinc-50">Strategy comparison</h1>
        {requested && (
          <p className="break-all font-mono text-xs text-zinc-400 dark:text-zinc-600">{requested.workspaceSlug}</p>
        )}
      </div>
      <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <ComparisonTable
          sourceWorkspaceId={id}
          initialSummary={summary}
          initialError={loadError}
          initialNotes={notes}
        />
      </div>
    </div>
  );
}
