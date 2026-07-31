import type { UpcomingStepsData } from "@/lib/types";

interface UpcomingStepsPanelProps {
  upcoming?: UpcomingStepsData;
}

export function UpcomingStepsPanel({ upcoming }: UpcomingStepsPanelProps) {
  if (!upcoming) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-bold text-black dark:text-zinc-50">Upcoming steps</h2>

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Final check</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {upcoming.finalCheck.status}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Cover letter</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {upcoming.coverLetter.status}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Application tracking
        </span>
        <ul className="mt-2 flex flex-col gap-1">
          {upcoming.tracking.fields.map((field) => (
            <li key={field} className="text-sm text-zinc-700 dark:text-zinc-300">
              {field}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
