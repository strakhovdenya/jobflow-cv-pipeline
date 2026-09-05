"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceManualNote } from "@/lib/api";
import { AccordionSection } from "@/components/accordion-section";
import { Spinner } from "@/components/spinner";
import { appendManualNoteAction } from "./actions";
import { ErrorList } from "./error-list";

const buttonClass =
  "inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const badgeClass =
  "rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

const STEP_LABELS: Record<string, string> = {
  prompt_1: "Prompt 1 (analysis)",
  prompt_2: "Prompt 2 (CV content)",
  skip_reason: "Skip reason",
  cover_letter: "Cover letter",
};

function formatStepBadge(
  promptStep: string,
  stepDetail: string | null,
): string {
  const stepLabel = STEP_LABELS[promptStep] ?? promptStep;
  return stepDetail ? `${stepLabel} · ${stepDetail}` : stepLabel;
}

// A fixed locale + timeZone is required here, not just any format: toLocaleString() with no
// arguments uses the runtime's ambient locale/TZ, which differs between the server (Node process
// env) and the client (browser) — causing a React hydration mismatch on initial SSR render.
function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface ManualNotePanelProps {
  workspaceId: string;
  manualNotes: WorkspaceManualNote[];
}

export function ManualNotePanel({
  workspaceId,
  manualNotes,
}: ManualNotePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function runAppendManualNote() {
    const trimmed = note.trim();
    if (trimmed === "") {
      setErrors(["Note is required."]);
      return;
    }
    setErrors([]);
    startTransition(async () => {
      const result = await appendManualNoteAction(workspaceId, {
        note: trimmed,
      });
      if (result.ok) {
        setNote("");
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <AccordionSection title="Manual notes" countBadge={manualNotes.length}>
      <div className="flex flex-col gap-3 pt-1">
        {manualNotes.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {manualNotes.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="whitespace-pre-wrap text-sm text-black dark:text-zinc-50">
                  {n.text}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatTimestamp(n.createdAt)}
                  </span>
                  {n.isLegacy && (
                    <span className={badgeClass}>Legacy note</span>
                  )}
                  {n.applications.length === 0 ? (
                    <span className={badgeClass}>Not applied yet</span>
                  ) : (
                    n.applications.map((app, i) => (
                      <span key={i} className={badgeClass}>
                        Applied to{" "}
                        {formatStepBadge(app.promptStep, app.stepDetail)} ·{" "}
                        {formatTimestamp(app.appliedAt)}
                      </span>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No manual notes yet.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="manualNoteInput" className="text-sm font-medium">
            Add a note
          </label>
          <textarea
            id="manualNoteInput"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        <div>
          <button
            type="button"
            disabled={isPending}
            onClick={runAppendManualNote}
            className={buttonClass}
          >
            {isPending && <Spinner />}
            {isPending ? "Adding…" : "Add note"}
          </button>
        </div>
        <ErrorList errors={errors} />
      </div>
    </AccordionSection>
  );
}
