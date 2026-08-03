"use client";

import { useState } from "react";
import type { ArtifactCardData, ArtifactKind } from "@/lib/types";

interface KindBadge {
  label: string;
  className: string;
}

const defaultKindBadge: KindBadge = {
  label: "",
  className:
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
};

const kindBadges: Record<ArtifactKind, KindBadge> = {
  source: { label: "SRC", className: defaultKindBadge.className },
  analysis: {
    label: "ANL",
    className:
      "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  },
  cv: {
    label: "CV",
    className:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  check: {
    label: "CHK",
    className:
      "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  html: {
    label: "HTM",
    className:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  pdf: {
    label: "PDF",
    className:
      "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
};

function kindBadge(kind: ArtifactKind): KindBadge {
  const badge = kindBadges[kind];
  if (badge) return badge;
  return { label: kind.slice(0, 3).toUpperCase(), className: defaultKindBadge.className };
}

type ArtifactCardProps = ArtifactCardData;

export function ArtifactCard({
  type,
  kind,
  ext,
  version,
  date,
  stage,
  expanded,
  preview,
  downloadUrl,
}: ArtifactCardProps) {
  // Resync isExpanded when the `expanded` prop changes (e.g. re-fetched artifact data with a
  // different default), without stomping a toggle the user made for the *same* prop value.
  // Adjusting state during render (not in an effect) avoids an extra render pass — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevExpandedProp, setPrevExpandedProp] = useState(expanded);
  const [isExpanded, setIsExpanded] = useState(expanded);
  if (expanded !== prevExpandedProp) {
    setPrevExpandedProp(expanded);
    setIsExpanded(expanded);
  }

  const badge = kindBadge(kind);

  return (
    <div className="border-b border-zinc-200 py-3 last:border-b-0 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <span
            className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="flex flex-col">
            <span className="font-mono text-sm font-semibold text-black dark:text-zinc-50">
              {type}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {stage} · {ext} · v{version} · {date}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`${type}.${ext}`}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Download
            </a>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {isExpanded ? "Hide" : "View"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 max-h-96 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
          {preview ? (
            <pre className="whitespace-pre-wrap break-words font-mono">{preview}</pre>
          ) : (
            <p className="text-zinc-500 dark:text-zinc-400">No preview available.</p>
          )}
        </div>
      )}
    </div>
  );
}
