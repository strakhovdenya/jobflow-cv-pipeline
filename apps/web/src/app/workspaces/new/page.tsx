"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { WorkspaceForm } from "@/components/workspace-form";
import { createWorkspaceAction } from "./actions";
import type { CreateWorkspaceInput, WorkspaceCreationResult } from "@/lib/api";

export default function NewWorkspacePage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<WorkspaceCreationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(input: CreateWorkspaceInput) {
    setErrors([]);

    startTransition(async () => {
      const response = await createWorkspaceAction(input);

      if (response.ok) {
        setResult(response.data);
      } else {
        setErrors(response.errors);
      }
    });
  }

  if (result) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm dark:border-green-800 dark:bg-green-950">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white dark:bg-green-500">
            ✓
          </span>
          <p className="font-medium text-green-800 dark:text-green-300">
            Workspace created · status: {result.status}
          </p>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Workspace slug
          </p>
          <p className="mt-1 break-all font-mono text-zinc-800 dark:text-zinc-200">
            {result.workspaceSlug}
          </p>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Folder path
          </p>
          <p className="mt-1 break-all font-mono text-zinc-800 dark:text-zinc-200">
            {result.folderPath}
          </p>
        </div>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Vacancy source
          </p>
          <p className="mt-1 break-all font-mono text-zinc-800 dark:text-zinc-200">
            {result.vacancySourcePath}
          </p>
        </div>

        <Link
          href={`/workspaces/${result.id}`}
          className="w-full rounded-md bg-black px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          View workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <WorkspaceForm onSubmit={handleSubmit} errors={errors} isSubmitting={isPending} />
    </div>
  );
}
