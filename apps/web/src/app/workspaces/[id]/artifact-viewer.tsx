"use client";

import { useState } from "react";
import type { WorkspaceArtifactSummary } from "@/lib/api";

const TEXT_FILE_EXTENSIONS = ["txt", "md", "json"];

/**
 * Some artifact types (e.g. vacancy_source, registered by workspaces.service.ts) are saved with
 * mimeType = null. Fall back to the canonical filename's extension so those still get an inline
 * viewer instead of silently losing it to a missing backend field.
 */
function isTextRenderable(artifact: WorkspaceArtifactSummary): boolean {
  if (artifact.mimeType != null) {
    return artifact.mimeType.startsWith("text/") || artifact.mimeType === "application/json";
  }
  const extension = artifact.canonicalFileName.split(".").pop()?.toLowerCase();
  return extension != null && TEXT_FILE_EXTENSIONS.includes(extension);
}

function downloadUrl(artifactId: string): string {
  return `/api/artifacts/${encodeURIComponent(artifactId)}/download`;
}

interface ArtifactRowProps {
  artifact: WorkspaceArtifactSummary;
}

function ArtifactRow({ artifact }: ArtifactRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleView() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (content !== null || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(downloadUrl(artifact.id));
      if (!response.ok) {
        throw new Error(`Failed to load content (status ${response.status})`);
      }
      setContent(await response.text());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <tr className="align-top">
      <td className="py-2">{artifact.artifactType}</td>
      <td className="break-all py-2 font-mono text-xs">{artifact.downloadFileName}</td>
      <td className="py-2">{artifact.version}</td>
      <td className="py-2">{artifact.isLatest ? "yes" : "no"}</td>
      <td className="py-2">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <a
              href={downloadUrl(artifact.id)}
              download={artifact.downloadFileName}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Download
            </a>
            {isTextRenderable(artifact) && (
              <button
                type="button"
                onClick={toggleView}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                {isOpen ? "Hide" : "View"}
              </button>
            )}
          </div>
          {isOpen && (
            <div className="max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
              {isLoading && (
                <p className="text-zinc-500 dark:text-zinc-400">Loading…</p>
              )}
              {error && (
                <p className="text-red-700 dark:text-red-300">{error}</p>
              )}
              {content !== null && !isLoading && !error && (
                <pre className="whitespace-pre-wrap break-words font-mono">
                  {content}
                </pre>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

interface ArtifactViewerProps {
  artifacts: WorkspaceArtifactSummary[];
}

export function ArtifactViewer({ artifacts }: ArtifactViewerProps) {
  if (artifacts.length === 0) {
    return (
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        No artifacts yet.
      </p>
    );
  }

  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead className="text-zinc-500 dark:text-zinc-400">
        <tr>
          <th className="py-1 font-medium">Type</th>
          <th className="py-1 font-medium">File</th>
          <th className="py-1 font-medium">Version</th>
          <th className="py-1 font-medium">Latest</th>
          <th className="py-1 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {artifacts.map((artifact) => (
          <ArtifactRow key={artifact.id} artifact={artifact} />
        ))}
      </tbody>
    </table>
  );
}
