import type { WorkspaceStatusHeaderData } from "@/lib/types";

type WorkspaceStatusHeaderProps = WorkspaceStatusHeaderData;

function FieldPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-black dark:text-zinc-50">{value}</span>
    </div>
  );
}

export function WorkspaceStatusHeader({
  company,
  role,
  slug,
  statusLabel,
  decision,
  score,
  reviewState,
  nextAction,
}: WorkspaceStatusHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-black text-sm font-bold text-white dark:bg-white dark:text-black">
            {company.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{company} · application</span>
        </div>
        <span className="w-fit shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          ● {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-bold text-black dark:text-zinc-50">{role}</h1>
          <p className="break-all font-mono text-xs text-zinc-400 dark:text-zinc-600">{slug}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex flex-wrap justify-end gap-2">
            <FieldPill label="decision" value={decision} />
            <FieldPill label="score" value={score} />
            <FieldPill label="review" value={reviewState} />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">next: {nextAction}</p>
        </div>
      </div>
    </div>
  );
}
