"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImportPreviewResult, ImportScanResult } from "@/lib/api";
import { confirmImportFolderAction, previewImportFolderAction } from "./actions";

interface ImportPreviewProps {
  scanResults: ImportScanResult[];
}

export function ImportPreview({ scanResults }: ImportPreviewProps) {
  const router = useRouter();
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [companyNameOverride, setCompanyNameOverride] = useState("");
  const [roleTitleOverride, setRoleTitleOverride] = useState("");
  const [selectedVacancySourcePath, setSelectedVacancySourcePath] = useState("");
  const [copyVacancySourceToCanonical, setCopyVacancySourceToCanonical] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  if (scanResults.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No importable folders found under the configured import root.
      </p>
    );
  }

  function selectFolder(folderPath: string) {
    setSelectedFolderPath(folderPath);
    setCompanyNameOverride("");
    setRoleTitleOverride("");
    setSelectedVacancySourcePath("");
    setCopyVacancySourceToCanonical(false);
    setPreview(null);
    setErrors([]);
  }

  function handlePreview() {
    if (!selectedFolderPath) return;
    setErrors([]);

    startTransition(async () => {
      const response = await previewImportFolderAction({
        folderPath: selectedFolderPath,
        companyNameOverride: companyNameOverride.trim() || undefined,
        roleTitleOverride: roleTitleOverride.trim() || undefined,
      });

      if (response.ok) {
        setPreview(response.data);
        setSelectedVacancySourcePath(
          response.data.vacancySourceCandidates.length === 1
            ? response.data.vacancySourceCandidates[0]
            : "",
        );
      } else {
        setPreview(null);
        setErrors(response.errors);
      }
    });
  }

  function handleConfirm() {
    if (!selectedFolderPath) return;
    setErrors([]);

    startTransition(async () => {
      const response = await confirmImportFolderAction({
        folderPath: selectedFolderPath,
        companyNameOverride: companyNameOverride.trim() || undefined,
        roleTitleOverride: roleTitleOverride.trim() || undefined,
        selectedVacancySourcePath: selectedVacancySourcePath || undefined,
        copyVacancySourceToCanonical,
      });

      if (response.ok) {
        router.push(`/workspaces/${response.data.workspaceId}`);
      } else {
        setErrors(response.errors);
      }
    });
  }

  const needsCandidateSelection = (preview?.vacancySourceCandidates.length ?? 0) !== 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {scanResults.map((scan) => (
              <tr
                key={scan.folderPath}
                className={
                  selectedFolderPath === scan.folderPath
                    ? "bg-zinc-100 dark:bg-zinc-900"
                    : undefined
                }
              >
                <td className="px-4 py-2">{scan.companyNameOriginal}</td>
                <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {scan.roleTitleOriginal ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {scan.legacyDate ?? "—"}
                  {scan.legacyDateConfidence === "low" && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">(low confidence)</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => selectFolder(scan.folderPath)}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedFolderPath && (
        <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">
            {selectedFolderPath}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="companyNameOverride" className="text-sm font-medium">
                Company name override <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="companyNameOverride"
                value={companyNameOverride}
                onChange={(e) => setCompanyNameOverride(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="roleTitleOverride" className="text-sm font-medium">
                Role title override <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="roleTitleOverride"
                value={roleTitleOverride}
                onChange={(e) => setRoleTitleOverride(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
          >
            {isPending ? "Loading…" : "Preview"}
          </button>

          {preview && (
            <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              {preview.isDuplicate && (
                <p
                  data-testid="duplicate-banner"
                  className="rounded-md border border-amber-400 bg-amber-50 p-2 font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                >
                  Already imported — matched by {preview.duplicateReason === "content_hash"
                    ? "vacancy content hash"
                    : "source path"}
                  {preview.duplicateWorkspaceId && (
                    <>
                      {" "}
                      (workspace <span className="break-all">{preview.duplicateWorkspaceId}</span>)
                    </>
                  )}
                  . Confirming will create a second workspace for the same folder.
                </p>
              )}

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-medium">Company slug</dt>
                <dd>{preview.companySlug}</dd>
                <dt className="font-medium">Role slug</dt>
                <dd>{preview.roleSlug ?? "—"}</dd>
                <dt className="font-medium">Suggested status</dt>
                <dd>{preview.suggestedStatus}</dd>
              </dl>

              {preview.detectedArtifacts.length > 0 && (
                <div>
                  <p className="font-medium">Detected artifacts</p>
                  <ul className="list-inside list-disc">
                    {preview.detectedArtifacts.map((artifact) => (
                      <li key={artifact.filePath} className="break-all">
                        {artifact.type} — {artifact.filePath}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <ul className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}

              {needsCandidateSelection && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="vacancySourceCandidate" className="font-medium">
                    Vacancy source file
                  </label>
                  <select
                    id="vacancySourceCandidate"
                    value={selectedVacancySourcePath}
                    onChange={(e) => setSelectedVacancySourcePath(e.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="">Select a candidate…</option>
                    {preview.vacancySourceCandidates.map((path) => (
                      <option key={path} value={path}>
                        {path}
                      </option>
                    ))}
                  </select>
                  {preview.vacancySourceCandidates.length === 0 && (
                    <p className="text-zinc-500 dark:text-zinc-400">
                      No vacancy source candidate detected in this folder.
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={copyVacancySourceToCanonical}
                  onChange={(e) => setCopyVacancySourceToCanonical(e.target.checked)}
                />
                Copy vacancy source into the new workspace folder (default: register in place)
              </label>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  isPending ||
                  (needsCandidateSelection && selectedVacancySourcePath === "")
                }
                className="w-fit rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {isPending ? "Importing…" : "Confirm import"}
              </button>
            </div>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <ul className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
