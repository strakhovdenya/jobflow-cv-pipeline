import { ActionButton } from "./main-action-card";
import type { CoverLetterPanelData } from "@/lib/types";

type CoverLetterPanelProps = {
  coverLetterPanel: CoverLetterPanelData;
  onAction: (label: string) => void;
};

/**
 * Named `PresentationalCoverLetterPanel`, not `CoverLetterPanel`, to avoid colliding with the
 * already-wired `CoverLetterPanel` at `apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx`
 * (which calls `generateCoverLetterAction` itself and decides its own visibility from
 * status/artifacts). This component is the epic's pure presentation counterpart, driven purely by
 * the `coverLetterPanel` PipelineScreen field — see CURRENT_TASK.md TASK-088 Progress Notes.
 */
export function PresentationalCoverLetterPanel({ coverLetterPanel, onAction }: CoverLetterPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {"text" in coverLetterPanel ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{coverLetterPanel.text}</p>
      ) : (
        <ActionButton label={coverLetterPanel.button} kind="primary" onAction={onAction} />
      )}
    </div>
  );
}
