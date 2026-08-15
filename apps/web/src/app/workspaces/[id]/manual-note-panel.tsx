"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { appendManualNoteAction } from "./actions";
import { ErrorList } from "./error-list";

const buttonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black";
const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

interface ManualNotePanelProps {
  workspaceId: string;
  manualNote: string | null;
}

export function ManualNotePanel({ workspaceId, manualNote }: ManualNotePanelProps) {
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
      const result = await appendManualNoteAction(workspaceId, { note: trimmed });
      if (result.ok) {
        setNote("");
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Manual notes
      </h2>

      {manualNote ? (
        <pre className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-black dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50">
          {manualNote}
        </pre>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No manual notes yet.</p>
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
          Add note
        </button>
      </div>
      <ErrorList errors={errors} />
    </section>
  );
}
