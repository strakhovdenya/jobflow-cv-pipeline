import type { Progress, Stage, StageBadge, StageOption, StageOptionState, StageState } from "@/lib/types";

const CIRCLE_STATE_CLASS: Record<StageState, string> = {
  done: "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black",
  current:
    "border-indigo-600 bg-white text-indigo-600 dark:border-indigo-400 dark:bg-zinc-950 dark:text-indigo-400",
  upcoming:
    "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-600",
};

const LABEL_STATE_CLASS: Record<StageState, string> = {
  done: "text-black dark:text-zinc-50",
  current: "font-semibold text-black dark:text-zinc-50",
  upcoming: "text-zinc-400 dark:text-zinc-600",
};

const OPTION_STATE_CLASS: Record<StageOptionState, string> = {
  next: "bg-indigo-600 text-white font-medium",
  pruned: "text-zinc-400 line-through dark:text-zinc-600",
  open: "border border-zinc-300 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
  chosen:
    "border border-green-400 bg-green-50 font-medium text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400",
};

const OPTION_PREFIX: Partial<Record<StageOptionState, string>> = {
  next: "→ ",
  chosen: "✓ ",
};

interface PipelineStagesProps {
  stages: Stage[];
  progress: Progress;
}

function StageOptionItem({ option }: { option: StageOption }) {
  return (
    <li
      title={option.reason}
      className={`rounded-md px-2 py-1 text-xs ${OPTION_STATE_CLASS[option.state]}`}
    >
      {OPTION_PREFIX[option.state]}
      {option.label}
    </li>
  );
}

// Pill-shaped, filled, borderless — same visual language as MainActionCard's MetaPill and
// WorkspaceStatusHeader's FieldPill, distinct from StageOptionItem's bordered/underlined
// clickable-looking states, so it reads as "badge" (info) not "button" (action) here too.
function StageBadgeItem({ badge }: { badge: StageBadge }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] dark:bg-zinc-900">
      <span className="text-zinc-500 dark:text-zinc-400">{badge.label}</span>
      <span className="font-semibold text-black dark:text-zinc-50">{badge.value}</span>
    </span>
  );
}

function StageCircle({ n, state }: { n: number; state: StageState }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${CIRCLE_STATE_CLASS[state]}`}
    >
      {state === "done" ? "✓" : n}
    </span>
  );
}

export function PipelineStages({ stages, progress }: PipelineStagesProps) {
  const percent = Math.round((progress.step / progress.total) * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Pipeline progress
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-black dark:text-zinc-50">
          {progress.step}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          / {progress.total} steps
        </span>
        <span className="ml-auto text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {percent}%
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="absolute left-4 top-4 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800"
        />
        <ol className="flex flex-col gap-4">
          {stages.map((stage) => (
            <li key={stage.key} className="relative flex items-start gap-3">
              <StageCircle n={stage.n} state={stage.state} />
              <div className="flex flex-1 flex-col gap-1 pt-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className={LABEL_STATE_CLASS[stage.state]}>{stage.label}</span>
                  {stage.state === "current" && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white dark:bg-indigo-400 dark:text-black">
                      Now
                    </span>
                  )}
                </div>
                {stage.badges && stage.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {stage.badges.map((badge, index) => (
                      <StageBadgeItem key={`${badge.label}-${index}`} badge={badge} />
                    ))}
                  </div>
                )}
                {stage.options && stage.options.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {stage.options.map((option, index) => (
                      <StageOptionItem key={`${option.label}-${index}`} option={option} />
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
