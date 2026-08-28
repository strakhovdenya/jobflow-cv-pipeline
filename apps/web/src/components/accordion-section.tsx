import type { ReactNode } from "react";

interface AccordionSectionProps {
  title: string;
  countBadge?: number;
  defaultOpen?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** "warning" keeps the section's neutral shell but swaps the amber safety-banner accent
   * (ADR-034's manual-note-forced-content panel) — everything else stays identical. */
  tone?: "default" | "warning";
}

const TONE_CONTAINER_CLASS: Record<NonNullable<AccordionSectionProps["tone"]>, string> = {
  default: "border-zinc-200 dark:border-zinc-800",
  warning: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
};

const TONE_TITLE_CLASS: Record<NonNullable<AccordionSectionProps["tone"]>, string> = {
  default: "text-black dark:text-zinc-50",
  warning: "text-amber-950 dark:text-amber-100",
};

// Plain <details>/<summary> — no client JS needed, and disclosure semantics (aria-expanded,
// keyboard toggle via Enter/Space, screen-reader "expanded"/"collapsed" state) come for free
// from the browser instead of being hand-rolled.
export function AccordionSection({
  title,
  countBadge,
  defaultOpen = true,
  headerExtra,
  children,
  tone = "default",
}: AccordionSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={`group rounded-lg border ${TONE_CONTAINER_CLASS[tone]}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-bold ${TONE_TITLE_CLASS[tone]}`}>{title}</h2>
          {countBadge !== undefined && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
              {countBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}
