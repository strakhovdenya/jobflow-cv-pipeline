"use client";

import { useState, useTransition } from "react";
import { previewWorkspaceSlug } from "@/lib/slug";
import { createWorkspaceAction } from "./actions";
import type { WorkspaceCreationResult } from "@/lib/api";

export function WorkspaceForm() {
  const [companyNameOriginal, setCompanyNameOriginal] = useState("");
  const [roleTitleOriginal, setRoleTitleOriginal] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<WorkspaceCreationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const slugPreview = previewWorkspaceSlug(companyNameOriginal, roleTitleOriginal);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);
    setResult(null);

    startTransition(async () => {
      const response = await createWorkspaceAction({
        companyNameOriginal,
        roleTitleOriginal,
        vacancyText,
        sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl.trim(),
      });

      if (response.ok) {
        setResult(response.data);
      } else {
        setErrors(response.errors);
      }
    });
  }

  if (result) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-green-300 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-950">
        <p className="font-medium text-green-800 dark:text-green-300">
          Workspace created — status: {result.status}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-zinc-700 dark:text-zinc-300">
          <dt className="font-medium">Workspace slug</dt>
          <dd className="break-all">{result.workspaceSlug}</dd>
          <dt className="font-medium">Folder path</dt>
          <dd className="break-all">{result.folderPath}</dd>
          <dt className="font-medium">Vacancy source</dt>
          <dd className="break-all">{result.vacancySourcePath}</dd>
        </dl>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="companyNameOriginal" className="text-sm font-medium">
          Company name
        </label>
        <input
          id="companyNameOriginal"
          value={companyNameOriginal}
          onChange={(e) => setCompanyNameOriginal(e.target.value)}
          required
          maxLength={200}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="roleTitleOriginal" className="text-sm font-medium">
          Role title
        </label>
        <input
          id="roleTitleOriginal"
          value={roleTitleOriginal}
          onChange={(e) => setRoleTitleOriginal(e.target.value)}
          required
          maxLength={200}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sourceUrl" className="text-sm font-medium">
          Source URL <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="vacancyText" className="text-sm font-medium">
          Vacancy text
        </label>
        <textarea
          id="vacancyText"
          value={vacancyText}
          onChange={(e) => setVacancyText(e.target.value)}
          required
          rows={12}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">Workspace folder preview</p>
        <p className="mt-1 break-all font-mono text-zinc-800 dark:text-zinc-200">
          storage/applications/{slugPreview}/00_vacancy_source.txt
        </p>
      </div>

      {errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
