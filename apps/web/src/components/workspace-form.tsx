"use client";

import { useState } from "react";
import { previewWorkspaceSlug } from "@/lib/slug";
import type { CreateWorkspaceInput } from "@/lib/api";
import { Spinner } from "./spinner";

export interface WorkspaceFormProps {
  onSubmit: (input: CreateWorkspaceInput) => void;
  errors?: string[];
  isSubmitting?: boolean;
}

export function WorkspaceForm({
  onSubmit,
  errors = [],
  isSubmitting = false,
}: WorkspaceFormProps) {
  const [companyNameOriginal, setCompanyNameOriginal] = useState("");
  const [roleTitleOriginal, setRoleTitleOriginal] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [vacancyText, setVacancyText] = useState("");

  const previewPath = `storage/applications/${previewWorkspaceSlug(companyNameOriginal, roleTitleOriginal)}/00_vacancy_source.txt`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      companyNameOriginal: companyNameOriginal.trim(),
      roleTitleOriginal: roleTitleOriginal.trim(),
      vacancyText,
      sourceUrl: sourceUrl.trim() === "" ? undefined : sourceUrl.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          new workspace
        </p>
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
          Create application workspace
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="companyNameOriginal" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Company name
          </label>
          <input
            id="companyNameOriginal"
            value={companyNameOriginal}
            onChange={(e) => setCompanyNameOriginal(e.target.value)}
            required
            maxLength={200}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="roleTitleOriginal" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Role title
          </label>
          <input
            id="roleTitleOriginal"
            value={roleTitleOriginal}
            onChange={(e) => setRoleTitleOriginal(e.target.value)}
            required
            maxLength={200}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sourceUrl" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Source URL <span className="text-zinc-400">— optional</span>
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="(none provided)"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="vacancyText" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Vacancy text
        </label>
        <textarea
          id="vacancyText"
          value={vacancyText}
          onChange={(e) => setVacancyText(e.target.value)}
          required
          rows={12}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500 dark:text-zinc-400">will save to</p>
        <p className="mt-1 break-all font-mono text-zinc-800 dark:text-zinc-200">{previewPath}</p>
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
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isSubmitting && <Spinner />}
        {isSubmitting ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
