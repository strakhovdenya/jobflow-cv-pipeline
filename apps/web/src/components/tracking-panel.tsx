import type { TrackingPanelData } from "@/lib/types";

type TrackingPanelProps = {
  trackingPanel: TrackingPanelData;
};

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

/**
 * Named `PresentationalTrackingPanel`, not `TrackingPanel`, to avoid colliding with the
 * already-wired `ApplicationTrackingPanel` at
 * `apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` (which owns its own state,
 * server actions and visibility logic). This component is the epic's pure presentation
 * counterpart, driven purely by the `trackingPanel` PipelineScreen field.
 */
function fieldId(prefix: string, label: string, index: number) {
  return `${prefix}-${label.toLowerCase().replace(/\s+/g, "-")}-${index}`;
}

export function PresentationalTrackingPanel({ trackingPanel }: TrackingPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      {trackingPanel.textFields.map((field, index) => {
        const id = fieldId("tracking-text", field.label, index);
        return (
          <div key={`${field.label}-${index}`} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.label}
            </label>
            <input id={id} className={inputClass} readOnly />
          </div>
        );
      })}
      {trackingPanel.selectFields.map((field, index) => {
        const id = fieldId("tracking-select", field.label, index);
        return (
          <div key={`${field.label}-${index}`} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {field.label}
            </label>
            <select id={id} className={inputClass} value={field.value} disabled>
              <option value={field.value}>{field.value}</option>
            </select>
          </div>
        );
      })}
    </div>
  );
}
