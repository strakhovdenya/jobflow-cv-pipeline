import { ActionButtonRow } from "./main-action-card";
import type { ActionsPanelData } from "@/lib/types";

type ActionsPanelProps = ActionsPanelData & {
  onAction: (label: string) => void;
};

export function ActionsPanel({ title, buttons, onAction }: ActionsPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-bold text-black dark:text-zinc-50">{title}</h2>

      <ActionButtonRow buttons={buttons} onAction={onAction} />
    </div>
  );
}
