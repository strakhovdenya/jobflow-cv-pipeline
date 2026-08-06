# Current Task

## TASK-077 — Component: MainActionCard

Third implementation sub-task of the TASK-073 epic (full `apps/web` redesign), on branch
`task/TASK-077-main-action-card`, branched from the epic base branch
`task/TASK-073-redesign-base` (ADR-025). PR targets `task/TASK-073-redesign-base`, not `main`.

## Context

Extracted from the mockups' `mainCard: { title, subtitle, meta?, info?, notice?, select?,
reasonNote?, reasonNoteLabel?, buttons }` shape. Replaces the current conditionally-rendered,
independently-styled action sections (TASK-073 pain point #1) with one consistent "what can I do
right now" card. Buttons carry a `kind` of `primary | secondary | disabled` — a `disabled` button
must still render (with its reason visible on hover/inline), addressing pain point #3 (buttons
appearing/disappearing with no forward visibility).

Field provenance across mockups:
- "03 - Source saved": `title`, `subtitle`, single `buttons` entry — baseline shape.
- "04 - Analysis review": `meta` rows, 4 buttons incl. one `disabled` (AI recommended `apply`, not
  `maybe`, so `Approve (maybe)` renders disabled — real review-gate logic wires this in TASK-083).
- "05 - CV generation": adds `info: { kind: 'info', text }` — a bordered banner distinct from a
  `meta` row and distinct from a button.
- "06 - CV draft ready": adds `reasonNote: true` — a boolean flag with no label text in this
  mockup's data. Its exact rendered content/label is intentionally NOT invented here beyond a
  generic placeholder slot — confirm real source text in TASK-083 (candidate: anti-overclaiming
  guard notes from `EvidenceGuardService`).
- "11 - SKIP - Skipped final": adds `notice` (plain string banner, no `kind` wrapper — visually
  distinct from `info`), `select: { label, value }` (first form-control field on `mainCard`,
  rendered generically, real option set deferred to TASK-083), and `reasonNoteLabel` (paired with
  `reasonNote`, rendered as the slot's visible label when present).

The "CURRENT STEP" / "next: ..." bar visible above the card in the screenshots is **not** part of
`mainCard`'s own data contract (confirmed against all 5 mockups' data blocks) — it belongs to the
parent screen assembly (TASK-081), not this component. `MainActionCard`'s own visual boundary
starts at `title`.

## Mockup reference

`docs/mockups/03-source-saved-screenshot.png`, `docs/mockups/04-analysis-review-screenshot.png`,
`docs/mockups/05-cv-generation-screenshot.png`, `docs/mockups/06-cv-draft-ready-screenshot.png`,
`docs/mockups/11-skip-skipped-final-screenshot.png` — screenshots are the primary layout reference
(see `docs/mockups/README.md`); the matching `.html` files' `<script type="text/x-dc">` blocks
supply the exact `mainCard` data contract values used in tests.

## Files Affected

```text
apps/web/src/components/main-action-card.tsx        (new)
apps/web/src/components/main-action-card.spec.tsx    (new)
apps/web/src/lib/types.ts                             (add MainActionCardData + field types)
```

## Docs to Read

- `docs/07_task_backlog.md` — `### TASK-077 — Component: MainActionCard` section (Context, Key
  Invariants, Acceptance criteria, Test requirement).
- `docs/mockups/03-source-saved.html`, `04-analysis-review.html`, `05-cv-generation.html`,
  `06-cv-draft-ready.html`, `11-skip-skipped-final.html` — `mainCard` data blocks (exact field
  values for tests).
- `apps/web/src/components/workspace-status-header.tsx` + `.spec.tsx` (TASK-076) — most recent
  component/test style reference (Tailwind conventions, light/dark variants, props-as-data-shape
  pattern).
- `apps/web/src/lib/types.ts` — existing type conventions to extend.

## Key Invariants

- Pure presentation component — receives `mainCard` data as props; does not itself decide which
  buttons are enabled/disabled (that's real business logic from `review-gates.service.ts`/
  workspace status, wired in TASK-083).
- `disabled` buttons must still be visible (not hidden) — this is the whole point of fixing pain
  point #3.
- `info` is optional and only one `kind` (`'info'`) is confirmed by a mockup so far — do not invent
  additional `kind` values speculatively.
- `notice` (plain string) and `info` (`{ kind, text }`) are visually distinct slots and can both be
  present independently — do not conflate them into one slot.
- `reasonNote` accepts either `boolean` or (once TASK-083 supplies real text) `string` — must not
  hard-fail on either shape.
- `select`'s real option list is not supplied by any mockup yet — render generically off
  `select.label`/`select.value` only, no hardcoded options array.

## Acceptance Criteria

- [x] Renders `title`, optional `subtitle`, optional `meta` rows, optional `info` banner, optional
      `notice` banner, optional `select` dropdown, optional `reasonNote` slot (with optional
      `reasonNoteLabel`), and all buttons with correct `primary`/`secondary`/`disabled` visual
      treatment.
- [x] Disabled buttons show their reason (an optional `reason` field on the button) on hover/inline.
- [x] `reasonNote` accepts either a plain boolean (renders a generic placeholder slot) or a string,
      without hard-failing on either shape; `reasonNoteLabel` renders as the visible label when
      present alongside it.
- [x] `notice` and `info` render as visually distinct slots and can both be handled independently.
- [x] `select: { label, value }` renders a labelled dropdown showing the current `value`.
- [x] Clicking a `primary`/`secondary` button fires `onAction(label)`; disabled buttons do not fire
      it.

## Test Requirement

`main-action-card.spec.tsx` covering: single-button state (03), multi-button mixed-state incl.
disabled-button click-is-a-noop (04), rendering with/without the `info` banner present (05 vs 03),
rendering with/without `reasonNote` present (06), and the "11" fixture (`notice` + `select` +
`reasonNote` + `reasonNoteLabel` all present together).

## Done Definition

Component renders correctly standalone with the exact `mainCard` example data from "03", "04",
"05", "06" and "11" mockups. Visual layout confirmed by the project owner against the real
mockup screenshots (dev-server preview route, per TASK-076 precedent) before closure.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-077 ..."`
3. `git push -u origin task/TASK-077-main-action-card`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

## Progress Notes

- **Branch created before the preceding sub-task merged.** `task/TASK-077-main-action-card` was
  branched off `task/TASK-073-redesign-base` while TASK-076's PR (#141) was still open — breaking
  the sequential pattern actually followed for TASK-075 → TASK-076. Once #141 merged, the branch
  had to be reconciled: `git stash` the WIP, fast-forward the branch to the updated base, then
  `stash pop` and resolve conflicts in `apps/web/src/lib/types.ts` and
  `project-management/CURRENT_TASK.md` (both files TASK-076 had also touched). No functional
  impact — `MainActionCard` and `WorkspaceStatusHeader` are independent components — but avoidable
  churn. Fixed going forward: added an explicit check to CLAUDE.md's Branch-first protocol (verify
  the preceding sub-task's PR into the base branch has merged before branching the next one; if
  not, ask the project owner whether to wait or proceed in parallel) and a process note to ADR-025
  in `DECISIONS.md`.
- Implementation otherwise matched the plan as written — no changes to the component's scope,
  data contract, or acceptance criteria. Visual layout confirmed by the project owner against the
  real mockup screenshots (03/04/05/06/11) via a temporary dev-server preview route (removed
  before this closure, not part of the deliverable), with no revision rounds needed (unlike
  TASK-075/076's two-round corrections) — the "CURRENT STEP"/"next:" bar visible above the card in
  the screenshots was confirmed out of scope for this component (belongs to TASK-081's screen
  assembly, not `mainCard`'s own data contract) rather than a missing feature.
- **Code review before closure caught a real cross-browser defect**: the first implementation put
  `title={reason}` directly on the disabled `<button>` element. Disabled form elements don't
  reliably receive mouse events in Chromium-based browsers, so the native `title` tooltip does not
  reliably show on hover for a disabled button there (Firefox is more forgiving) — meaning the
  acceptance criterion "disabled buttons show their reason on hover" would have silently failed in
  the most common browser despite the unit test passing (the test only asserted the attribute
  existed, not real hover rendering, which jsdom can't exercise). Fixed by wrapping the disabled
  button in a `<span title={reason}>` instead — a non-disabled wrapper reliably receives hover
  regardless of the inner button's disabled state. Test updated to assert the `title` on the
  wrapping `span` (`disabledButton.closest("span")`) rather than the button itself.

## Last completed: TASK-076

Component: WorkspaceStatusHeader — second implementation sub-task of the TASK-073 epic. New
`apps/web/src/components/workspace-status-header.tsx` renders the shared workspace header: a
small avatar-initial + `{company} · application` caption and a status pill on the top row, the
`role` as the large heading with `slug` in small monospace text below it, and
`decision`/`score`/`reviewState` as compact single-line bordered pills stacked to the right of the
title, with a `next: {nextAction}` hint beneath them. New `apps/web/src/lib/types.ts` adds
`WorkspaceStatusHeaderData`. Visual direction confirmed by the project owner against the real
mockups (03/04/05) after two review round-trips — see the archived task's "Progress Notes"
section for what changed and why (the initial layout assumption from planning, before the real
mockups were compared live in-browser, inverted the company/role hierarchy and used stacked
rather than single-line field pills). 104/104 `apps/web` tests pass (3 new). Archived verbatim to
`project-management/completed-tasks/TASK-076-workspace-status-header.md`. PR #141 merged into
`task/TASK-073-redesign-base`.
