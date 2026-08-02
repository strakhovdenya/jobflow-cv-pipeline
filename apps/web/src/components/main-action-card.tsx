import type { ActionButtonKind, MainActionButton, MainActionCardData } from "@/lib/types";

type MainActionCardProps = MainActionCardData & {
  onAction: (label: string) => void;
};

function MetaPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-black dark:text-zinc-50">{value}</span>
    </div>
  );
}

const buttonKindClasses: Record<ActionButtonKind, string> = {
  primary:
    "bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200",
  secondary:
    "border border-zinc-300 bg-white text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800",
  disabled:
    "cursor-not-allowed border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600",
};

export function ActionButton({
  label,
  kind,
  reason,
  onAction,
}: {
  label: string;
  kind: ActionButtonKind;
  reason?: string;
  onAction: (label: string) => void;
}) {
  const button = (
    <button
      type="button"
      disabled={kind === "disabled"}
      onClick={() => onAction(label)}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${buttonKindClasses[kind]}`}
    >
      {label}
    </button>
  );

  // A `title` on a disabled <button> doesn't reliably show on hover in Chromium
  // browsers (disabled elements don't receive mouse events); wrap in a span instead.
  if (kind === "disabled" && reason) {
    return <span title={reason}>{button}</span>;
  }

  return button;
}

export function ActionButtonRow({
  buttons,
  onAction,
}: {
  buttons: MainActionButton[];
  onAction: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button, index) => (
        <ActionButton key={`${button.label}-${index}`} {...button} onAction={onAction} />
      ))}
    </div>
  );
}

export function MainActionCard({
  title,
  subtitle,
  meta,
  info,
  notice,
  select,
  reasonNote,
  reasonNoteLabel,
  buttons,
  onAction,
}: MainActionCardProps) {
  const hasReasonNote = reasonNote !== undefined && reasonNote !== false;
  const reasonNoteValue = typeof reasonNote === "string" ? reasonNote : "";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-black dark:text-zinc-50">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
      </div>

      {meta && meta.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meta.map((item) => (
            <MetaPill key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      )}

      {info && (
        <div className="rounded-md border border-indigo-300 bg-indigo-100/60 px-4 py-3 text-sm text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
          › {info.text}
        </div>
      )}

      {notice && <p className="text-sm text-indigo-700 dark:text-indigo-400">{notice}</p>}

      {select && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{select.label}</span>
          <select
            defaultValue={select.value}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value={select.value}>{select.value}</option>
          </select>
        </label>
      )}

      {hasReasonNote && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{reasonNoteLabel ?? "Note"}</span>
          <input
            type="text"
            defaultValue={reasonNoteValue}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      )}

      <ActionButtonRow buttons={buttons} onAction={onAction} />
    </div>
  );
}
