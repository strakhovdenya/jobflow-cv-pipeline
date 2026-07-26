# Current Task

## TASK-076 — Component: WorkspaceStatusHeader

**Status:** DONE
**Branch:** `task/TASK-076-workspace-status-header` (off epic base branch `task/TASK-073-redesign-base`, per ADR-025)

### Context

Second component sub-task of the TASK-073 epic (full `apps/web` UI/UX redesign; see TASK-075 for
shared epic context/mockup sourcing). Extracted from the "03"/"04"/"05" mockups' shared header
fields: `company`, `role`, `slug`, `statusLabel`, `decision`, `score`, `reviewState`, `nextAction`.
Replaces the current plain-text `Status: cv_draft_ready` line (TASK-073 pain point #2) with a
structured header that always shows company/role/current status/next-action hint together. "05" is
the first example with a fully-populated `reviewState` (`'approved'`, alongside `decision: 'apply'`,
`score: 75`) — "03"/"04" only showed the `'—'` placeholder and (in "04") a resolved `score`/`decision`
without a resolved `reviewState`.

### Mockup reference

`docs/mockups/03-source-saved.html`, `docs/mockups/04-analysis-review.html`,
`docs/mockups/05-cv-generation.html` (saved and verified, 2026-07-23 — see
`docs/mockups/README.md`).

Extracted data values (from each mockup's `renderVals()` data block):

| Field | 03 (Source saved) | 04 (Analysis review) | 05 (CV generation) |
|---|---|---|---|
| `company` | `'Hired'` | `'Hired'` | `'Hired'` |
| `role` | `'Fullstack Developer · React / Node.js · Remote'` | same | same |
| `slug` | `'2026_07_21_Hired_Fullstack_Developer_React_Node_js_Remote'` | same | same |
| `statusLabel` | `'Source saved'` | `'Paused after analysis'` | `'CV generation running'` |
| `decision` | `'—'` | `'apply'` | `'apply'` |
| `score` | `'—'` | `75` | `75` |
| `reviewState` | `'—'` | `'—'` | `'approved'` |
| `nextAction` | `'Start analysis'` | `'Review the analysis result and decide apply/maybe/skip/pause'` | `'Waiting for CV draft generation to complete'` |

### Files Affected

```text
apps/web/src/lib/types.ts                                   (edit — add header data type)
apps/web/src/components/workspace-status-header.tsx         (new)
apps/web/src/components/workspace-status-header.spec.tsx    (new)
```

### Docs to Read

- `docs/mockups/03-source-saved.html`, `04-analysis-review.html`, `05-cv-generation.html` —
  `renderVals()` data blocks (exact field set and example values, table above extracted from these).
- `apps/web/src/components/pipeline-stages.tsx` + `pipeline-stages.spec.tsx` (TASK-075) — reference
  for component/test style conventions (Tailwind classes, dark-mode variants, prop-driven pure
  presentation, no data fetching).
- `apps/web/src/lib/types.ts` — existing `Stage`/`StageOption`/`Progress` types, to match style when
  adding the new header data type.

### Key Invariants

- Pure presentation component — receives all fields as props, does not fetch or derive them.
- `decision`/`score`/`reviewState` render as `'—'` when not yet applicable (mockup "03": all three
  are `'—'` before analysis runs) — must handle the placeholder case, not just the populated case,
  without layout breakage.

### Acceptance Criteria

- [x] Renders company, role, slug, status label, decision, score, review state and the
      next-action hint text from props.
- [x] Handles the pre-analysis placeholder state (`'—'` fields) without layout breakage.

### Test Requirement

- `workspace-status-header.spec.tsx` covering:
  1. the placeholder state (`'—'` fields, per mockup "03")
  2. a partially-resolved state (`decision`/`score` set, `reviewState` still `'—'`, per mockup "04")
  3. a fully-resolved state (`reviewState: 'approved'`, per mockup "05")

### Done Definition

- Component renders correctly standalone with mock props for the "Source saved", "Analysis
  review" and "CV generation" example data shown in the mockups.
- All `apps/web` tests pass (existing + new).
- Visual direction confirmed by the project owner against the real mockups (03/04/05), per the
  TASK-075 precedent.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-076 ..."`
3. `git push -u origin task/TASK-076-workspace-status-header`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

### Progress Notes (deviations from the plan above)

The plan above (written before implementation) assumed a layout structurally similar to TASK-075:
company as the large heading, decision/score/reviewState as full-width stacked label/value pairs,
a full-width status pill. The real mockups (compared live in-browser, not fully re-parsed from
the bundled/compiled mockup HTML before writing the plan) turned out to structure the header
differently, discovered only during visual review:

- **Round 1:** project owner flagged the hierarchy was inverted — `role` is the large heading, not
  `company`; `company` is a small caption (`{company} · application`, with a black avatar-square
  showing its first initial) next to a top-right status pill; `decision`/`score`/`reviewState`
  render as compact bordered pills to the right of the title, not full-width stacked fields below
  it. This also surfaced a preview-page-only bug (the temporary preview route's `max-w-md`
  wrapper caused the pills to overflow horizontally) — fixed by widening the preview container and
  adding `flex-wrap` to the component itself for narrow-viewport safety.
- **Round 2:** the field pills were still two lines each (label above value); changed to a single
  inline line (`decision apply`) to match the mockups.

Project owner confirmed the result ("давай так") after round 2. The Acceptance Criteria above are
still satisfied as written (all fields render, placeholder state handled) — only the concrete
visual arrangement changed from what was assumed at planning time. `docs/mockups/README.md`'s
existing note that the mockup `.html` files must be opened locally in a browser (not parsed from
the compiled/bundled source, which obscures the actual rendered DOM structure) applies here too —
worth deliberately doing that during planning for TASK-077 onward, not only during visual review.

## Last completed: TASK-075

Component: PipelineStages (branching pipeline visualization) — first implementation sub-task of
the TASK-073 epic. New `apps/web/src/components/pipeline-stages.tsx` renders the 11-stage
pipeline as a vertical stepper (numbered circles + connecting line, progress bar/percentage,
"Now" badge) with decision-stage options (next/pruned±reason/open/chosen, `reason` as a `title`
tooltip). Visual direction confirmed by the project owner against the real mockups (03/04/05/10)
after two review round-trips. 101/101 `apps/web` tests pass (5 new). Archived verbatim to
`project-management/completed-tasks/TASK-075-pipeline-stages.md`.
