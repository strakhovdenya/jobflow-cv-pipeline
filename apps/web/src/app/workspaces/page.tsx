import Link from "next/link";
import { listWorkspaces } from "@/lib/api";

export default async function WorkspacesListPage() {
  const workspaces = await listWorkspaces();

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Workspaces
        </h1>
        <Link
          href="/workspaces/new"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          New workspace
        </Link>
      </div>

      {workspaces.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No workspaces yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {workspaces.map((workspace) => (
                <tr key={workspace.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="font-medium text-black underline dark:text-zinc-50"
                    >
                      {workspace.company.nameOriginal}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    {workspace.jobVacancy.roleTitleOriginal}
                  </td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    {workspace.status}
                  </td>
                  <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                    {workspace.currentDecision ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
