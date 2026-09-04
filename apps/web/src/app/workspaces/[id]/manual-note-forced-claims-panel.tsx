import type { WorkspaceManualNoteForcedClaim } from "@/lib/api";
import { AccordionSection } from "@/components/accordion-section";

const badgeClass =
  "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200";

const STEP_LABELS: Record<WorkspaceManualNoteForcedClaim["step"], string> = {
  prompt_1: "Prompt 1 (analysis)",
  prompt_2: "Prompt 2 (CV content)",
  skip_reason: "Skip reason",
  cover_letter: "Cover letter",
};

interface ManualNoteForcedClaimsPanelProps {
  claims: WorkspaceManualNoteForcedClaim[];
}

// ADR-034: surfaces manual-note-forced, unverified content before any export/send action, so it
// is never mistaken for an AI-confirmed claim. Renders nothing when there is nothing forced.
export function ManualNoteForcedClaimsPanel({
  claims,
}: ManualNoteForcedClaimsPanelProps) {
  if (claims.length === 0) {
    return null;
  }

  return (
    <AccordionSection
      title="Manual-note-forced content"
      countBadge={claims.length}
      defaultOpen={false}
      tone="warning"
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          These items were added directly from your manual note, bypassing the evidence check.
          They are not AI-verified — review before exporting or sending.
        </p>
        <ul className="flex flex-col gap-2">
          {claims.map((claim, i) => (
            <li
              key={i}
              className="rounded-md border border-amber-200 bg-white p-3 dark:border-amber-900 dark:bg-zinc-950"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className={badgeClass}>user-forced, unverified</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {STEP_LABELS[claim.step]} · {claim.location}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-black dark:text-zinc-50">
                {claim.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </AccordionSection>
  );
}
