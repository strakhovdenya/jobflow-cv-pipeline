# Current Task

## TASK-084 — Component: ChecksPanel (pre-PDF / final check status)

**Status:** DONE (2026-07-30). Branch: `task/TASK-084-checks-panel`, off epic base branch
`task/TASK-073-redesign-base` (up to date with `origin/task/TASK-073-redesign-base`, which
includes TASK-083's merged PR #149; verified via `gh pr list --base
task/TASK-073-redesign-base --state all` before branching — no open sub-task PR into the base).

**Context:** Sixth component sub-task of the TASK-073 epic. Flagged during the "06 - CV draft
ready" mockup review (2026-07-23): the `PipelineScreen` contract's top-level `checks: { state:
'not_run' }` field is not covered by any of the five already-planned components (TASK-075–079) —
it needed a dedicated new component. Unlike TASK-083 (an integration task writing mapping logic
into an existing file), this is a pure presentation component task, matching the TASK-075–079
pattern: not wired into the real `/workspaces/[id]` route in this task, and does not map real
`pre-pdf-check.schema.ts`/`final-check.schema.ts` field names into its props (future integration
work).

**Mockup reference:** exact contracts extracted from each mockup's `<script type="text/x-dc">`
`renderVals()` block via `node -e` (not guessed from screenshots):

```text
// 06-cv-draft-ready.html — not_run
checks: { state: 'not_run' }

// 07-pre-pdf-check-result.html — result, compact: false, with findings
checks: { state: 'result', compact: false, readiness: 'ready_with_minor_edits',
  suggestions: 1, blockers: 0,
  findings: [ { id: 'summary[0]', severity: 'suggestion',
    message: 'More specific phrasing improves ATS keyword match.',
    original: 'Backend engineer with cloud experience.',
    suggested: 'Backend engineer with commercial Node.js/TypeScript and Azure serverless experience.' } ],
  notes: 'CV draft is in good shape; minor wording suggestions only.' }

// 08-export-pdf.html — result, compact: true, findings key ABSENT (not an empty array)
checks: { state: 'result', compact: true, readiness: 'ready_with_minor_edits',
  suggestions: 1, blockers: 0,
  notes: 'CV draft is in good shape; minor wording suggestions only.' }

// 13-final-check-pdf-ready.html — finalCheckPanel, independent top-level prop
finalCheckPanel: {
  banner: 'ready_to_send · quality score 92 · 2 pages',
  checks: [ 'PDF opens', 'Content matches vacancy', 'No unsupported claims',
    'Contact info present', 'Ready to apply' ],
  emptySections: [ { title: 'MISSING SECTIONS', value: 'None' },
    { title: 'FORMATTING ISSUES', value: 'None' },
    { title: 'OVERCLAIMING ISSUES', value: 'None' },
    { title: 'BROKEN LINKS', value: 'None' } ],
  warnings: [ 'Manual visual check still recommended before sending.' ]
}
```

Backend enums confirmed by reading the real schemas (used only to know which values the component
must be able to style — no field-name mapping happens in this task):
`apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts` — `PrePdfCheckReadiness = 'ready' |
'ready_with_minor_edits' | 'not_ready'`; `PrePdfCheckCorrection.severity = 'critical' | 'warning' |
'suggestion'`. `apps/api/src/pipeline/schemas/final-check.schema.ts` — `FinalCheckOutput` shape
(not directly reused; `finalCheckPanel` prop here is presentation-only).

**Files affected:**

```text
apps/web/src/lib/types.ts               (add ChecksData/ChecksFinding/FinalCheckPanelData types)
apps/web/src/components/checks-panel.tsx        (new)
apps/web/src/components/checks-panel.spec.tsx   (new)
```

**Docs to Read:**

- The four mockup data contracts above (already extracted).
- `apps/api/src/pipeline/schemas/pre-pdf-check.schema.ts` — `PrePdfCheckReadiness`,
  `PrePdfCheckCorrection.severity` enum values (styling only).
- `apps/api/src/pipeline/schemas/final-check.schema.ts` — `FinalCheckOutput` shape (context only).
- `apps/web/src/components/artifact-list.tsx` + `artifact-card.tsx` — bordered-card-with-count
  layout pattern and Tailwind zinc/indigo/amber/rose color conventions to reuse for readiness/
  severity badges.
- `apps/web/src/lib/types.ts` — existing type conventions (`ArtifactKind`, `MainActionCardData`)
  to match when adding the new types.

**Key Invariants:**

- `checks` (pre-PDF check, Prompt 3) and `finalCheckPanel` (final check, Prompt 5) are two
  independent optional props — not variants of one state. Neither requires the other; both, either,
  or neither may be present and must render correctly in every combination.
- `checks.state === 'not_run'` renders a quiet placeholder only — no readiness badge, no findings,
  no counts.
- `checks.state === 'result'` findings list rendering is driven strictly by **key presence**
  (`'findings' in checks`), not by `compact` and not by array length: an absent `findings` key (the
  `compact: true` mockup 08 case) renders no findings section at all; a present-but-empty array
  renders an explicit empty-state row. `compact` only affects density/spacing, never content
  presence.
- `suggestions`/`blockers` counts and `finalCheckPanel.banner` are rendered as given — never
  recomputed from `findings.length` or assembled from parts.
- `finalCheckPanel.checks` (a `string[]` checklist) is unrelated to the top-level `checks` prop
  despite the coincidental name reuse from the mockup author — do not conflate them in the render
  code or share a variable/prop name between the two.
- Pure presentation component: no data fetching, no computation of readiness/counts/banner, no
  mapping from real backend schema field names (that is a future integration task, same as
  TASK-078's artifact preview was for `ArtifactCard`).
- Not wired into `/workspaces/[id]` in this task — standalone component only, verified via a
  temporary preview route removed before commit (per TASK-079's pattern).

**Acceptance Criteria:**

- [x] `checks.state === 'not_run'` renders a placeholder, no findings/readiness/counts shown.
- [x] `checks.state === 'result'` renders correctly for all three `readiness` values (`ready`,
      `ready_with_minor_edits`, `not_ready`) with distinct styling per value.
- [x] Findings render correctly for all three `severity` values (`critical`, `warning`,
      `suggestion`) with distinct styling per value, including `original`/`suggested` text when
      present.
- [x] `findings` present with 1+ items renders the list; `findings` present as `[]` renders an
      explicit empty-state row; `findings` key absent renders no findings section at all.
- [x] `compact: true` vs `compact: false` changes only density/spacing, not which content renders.
- [x] `finalCheckPanel` renders independently of `checks` (present alone, `checks` absent).
- [x] `checks` renders independently of `finalCheckPanel` (present alone, `finalCheckPanel`
      absent).
- [x] Both `checks` and `finalCheckPanel` absent → component renders nothing, no errors.
- [x] Both present together render both blocks correctly.

**Test requirement:**

- `checks-panel.spec.tsx` (Vitest + RTL) covering every Acceptance Criterion above: `not_run`; all
  3 `readiness` values; all 3 `severity` values; findings with 1 item / empty array / absent key;
  `compact` true vs false; `finalCheckPanel` alone (fixture from mockup 13); `checks` alone; neither
  prop present; both present.

**Done definition:**

- `ChecksPanel` can be dropped onto a page with mock `checks`/`finalCheckPanel` props (independently
  or together) and renders correctly for every state above without depending on real workspace data.

**Git Instructions:**

1. `git add <files>`
2. `git commit -m "feat: TASK-084 ..."`
3. `git push -u origin task/TASK-084-checks-panel`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

**Progress Notes:**

- No divergence from the plan above — implementation matched the design as written, including the
  strict key-presence check for `findings` (`'findings' in checks`) that was the task's trickiest
  invariant. Manual visual check used a temporary preview route
  (`apps/web/src/app/dev-checks-panel-preview/page.tsx`, deleted before commit) rendering all six
  scenarios against the already-running dev server; the project owner confirmed it looked correct.
  No dedicated screenshot tool was available in this environment (no `chromium-cli`, no Playwright
  installed), so the check relied on the raw rendered HTML plus the project owner's own browser
  look, not an automated screenshot.
