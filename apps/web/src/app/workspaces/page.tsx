import Link from "next/link";
import { listWorkspaces } from "@/lib/api";
import { WorkspaceList } from "@/components/workspace-list";

export default async function WorkspacesListPage() {
  const workspaces = await listWorkspaces();

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Workspaces</h1>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            {workspaces.length} {workspaces.length === 1 ? "workspace" : "workspaces"}
          </span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/import"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Import from folder
          </Link>
          <Link
            href="/workspaces/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            New workspace
          </Link>
        </div>
      </div>

      <WorkspaceList workspaces={workspaces} />
    </div>
  );
}
