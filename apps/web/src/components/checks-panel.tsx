import type {
  ChecksData,
  ChecksFinding,
  ChecksReadiness,
  FinalCheckPanelData,
  FindingSeverity,
} from "@/lib/types";

interface ChecksPanelProps {
  checks?: ChecksData;
  finalCheckPanel?: FinalCheckPanelData;
}

const readinessBadges: Record<ChecksReadiness, string> = {
  ready:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ready_with_minor_edits:
    "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  not_ready:
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

const severityBadges: Record<FindingSeverity, string> = {
  critical:
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
  warning:
    "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  suggestion:
    "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
};

function readinessLabel(readiness: ChecksReadiness): string {
  return readiness.replace(/_/g, " ");
}

function FindingRow({ finding, compact }: { finding: ChecksFinding; compact: boolean }) {
  return (
    <div
      className={`border-b border-zinc-200 last:border-b-0 dark:border-zinc-800 ${compact ? "py-2" : "py-3"}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${severityBadges[finding.severity]}`}
        >
          {finding.severity}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black dark:text-zinc-50">{finding.message}</span>
          {finding.original !== undefined && (
            <span className="text-xs text-zinc-500 line-through dark:text-zinc-500">
              {finding.original}
            </span>
          )}
          {finding.suggested !== undefined && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              {finding.suggested}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecksSection({ checks }: { checks: ChecksData }) {
  if (checks.state === "not_run") {
    return (
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-black dark:text-zinc-50">Pre-PDF check</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Pre-PDF check hasn&apos;t run yet.
        </p>
      </div>
    );
  }

  const hasFindings = "findings" in checks;
  const findings = checks.findings ?? [];

  return (
    <div className={`rounded-lg border border-zinc-200 dark:border-zinc-800 ${checks.compact ? "p-3" : "p-5"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-black dark:text-zinc-50">Pre-PDF check</h2>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${readinessBadges[checks.readiness]}`}
        >
          {readinessLabel(checks.readiness)}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {checks.suggestions} suggestion{checks.suggestions === 1 ? "" : "s"} ·{" "}
          {checks.blockers} blocker{checks.blockers === 1 ? "" : "s"}
        </span>
      </div>

      <p className={`text-sm text-zinc-600 dark:text-zinc-400 ${checks.compact ? "mt-2" : "mt-3"}`}>
        {checks.notes}
      </p>

      {hasFindings && (
        <div className={checks.compact ? "mt-2" : "mt-3"}>
          {findings.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No findings.</p>
          ) : (
            findings.map((finding) => (
              <FindingRow key={finding.id} finding={finding} compact={checks.compact} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FinalCheckSection({ finalCheckPanel }: { finalCheckPanel: FinalCheckPanelData }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-bold text-black dark:text-zinc-50">Final check</h2>
      <p className="mt-2 text-sm font-semibold text-black dark:text-zinc-50">
        {finalCheckPanel.banner}
      </p>

      <ul className="mt-3 flex flex-col gap-1">
        {finalCheckPanel.checks.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {finalCheckPanel.emptySections.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {section.title}
            </span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{section.value}</span>
          </div>
        ))}
      </div>

      {finalCheckPanel.warnings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1">
          {finalCheckPanel.warnings.map((warning) => (
            <li key={warning} className="text-xs text-amber-700 dark:text-amber-400">
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChecksPanel({ checks, finalCheckPanel }: ChecksPanelProps) {
  if (!checks && !finalCheckPanel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {checks && <ChecksSection checks={checks} />}
      {finalCheckPanel && <FinalCheckSection finalCheckPanel={finalCheckPanel} />}
    </div>
  );
}
