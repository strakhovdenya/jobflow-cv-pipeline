# Current Task

## TASK-089 — Component: TrackingPanel (application-tracking form)

Status: DONE

Tenth component sub-task of the TASK-073 redesign epic (see ADR-025). Adds a pure-presentation
component rendering the top-level `trackingPanel` `PipelineScreen` field, present identically in
mockups 12 ("COVER LETTER - Generated final") and 13 ("FINAL CHECK PDF - Ready"):
`{ textFields: [{ label }], selectFields: [{ label, value }] }`.

## Context

- Epic TASK-073 has merged: TASK-075 (PipelineStages), TASK-076 (WorkspaceStatusHeader),
  TASK-077 (MainActionCard), TASK-078 (ArtifactList/ArtifactCard), TASK-079 (WorkspaceForm),
  TASK-080 (`/workspaces/new` assembly), TASK-081 (`/workspaces/[id]` assembly), TASK-082
  (`/workspaces` list assembly), TASK-083 (real backend mapping in `pipeline-view-model.ts`),
  TASK-084 (ChecksPanel), TASK-085 (UpcomingStepsPanel), TASK-087 (ActionsPanel), TASK-088
  (CoverLetterPanel / `PresentationalCoverLetterPanel`).
- Name collision confirmed before starting (per TASK-088 Progress Notes lesson): a fully-wired
  `ApplicationTrackingPanel` already exists at
  `apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx`, with its own state, server
  actions (mark ready/applied/rejected, archive, save rejection text) and its own
  `ArtifactSelect`. It is unrelated to this task's static presentation contract. To avoid the
  collision, the new component is named `PresentationalTrackingPanel`, matching the
  `PresentationalCoverLetterPanel` precedent from TASK-088.
- Exact contract confirmed via `node -e` against both mockups' `<script type="text/x-dc">`
  `renderVals()` blocks (not guessed from screenshots):
  - Mockup 12: `trackingPanel: { textFields: [ { label: 'Applied via' }, { label: 'Notes' } ], selectFields: [ { label: 'Submitted CV artifact', value: '—' }, { label: 'Submitted cover letter artifact', value: 'cover_letter_md' } ] }`
  - Mockup 13: same `textFields`; `selectFields` values both `'—'`.
  - Shape is stable across both mockups; only `selectFields[].value` varies.

## Files Affected

- `apps/web/src/lib/types.ts` — add `TrackingTextField`, `TrackingSelectField`, `TrackingPanelData`.
- `apps/web/src/components/tracking-panel.tsx` — new, exports `PresentationalTrackingPanel`.
- `apps/web/src/components/tracking-panel.spec.tsx` — new.

## Docs to Read

- `docs/mockups/12-cover-letter-generated-final.html` — `<script type="text/x-dc">` block, `trackingPanel` field.
- `docs/mockups/13-final-check-pdf-ready.html` — same field, for cross-mockup contract confirmation.
- `apps/web/src/components/cover-letter-panel.tsx` — naming-collision precedent to follow (`Presentational*` pattern).
- `apps/web/src/lib/types.ts` — existing `PipelineScreen`-field type conventions.

## Key Invariants

- Pure presentation only: no server actions, no `onSubmit` backend call, no visibility logic
  based on workspace status — that already lives in the real, wired
  `ApplicationTrackingPanel` (`apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx`),
  which this task does not touch or replace.
- Not wired into `/workspaces/[id]` in this task (consistent with TASK-084/085/087/088).
- Component and prop naming must not collide with the existing wired
  `ApplicationTrackingPanel` — use `PresentationalTrackingPanel`.

## Acceptance Criteria

- [x] `TrackingPanelData` (`textFields: TrackingTextField[]`, `selectFields: TrackingSelectField[]`) added to `apps/web/src/lib/types.ts`.
- [x] `apps/web/src/components/tracking-panel.tsx` renders each `textFields[]` entry as a labeled text input and each `selectFields[]` entry as a labeled select showing its `value`.
- [x] `apps/web/src/components/tracking-panel.spec.tsx` covers both arrays rendering with correct labels/values.
- [x] No wiring into `/workspaces/[id]`.
- [x] `npx tsc --noEmit` and `npm run test` clean in `apps/web`.

## Test Requirement

Vitest + React Testing Library render test in `tracking-panel.spec.tsx`, asserting `textFields`
labels and `selectFields` labels + values are present in the rendered output.

## Done Definition

All acceptance criteria checked, tests green, Task Closure Checklist verified inline before commit.

## Progress Notes

A same-session `/code-review` pass found one bug in the initial implementation: both
`textFields.map`/`selectFields.map` keyed each row (and derived each `<input>`/`<select>` `id` via
a `fieldId` helper) purely from `field.label`, with no index fallback. Two fields sharing a label
would collide on both the React `key` and the generated DOM `id` — the second field's `<label
htmlFor>` would then resolve to the first field's input, breaking the accessible label
association. This is the same class of bug already found and fixed once before in this codebase
(`main-action-card.tsx`/`ActionsPanel`, TASK-087, `key={button.label}` → `` `${label}-${index}`
``), reintroduced here since this component didn't reuse that code path. Fixed by applying the
identical `` `${label}-${index}` `` pattern to both the `key` and the generated `id` in
`tracking-panel.tsx`. Re-verified: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run test`
207/207 passed after the fix.

## Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-089 ..."`
3. `git push -u origin task/TASK-089-tracking-panel`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Does not do anything else.

## Last completed: TASK-088

Ninth component sub-task of the TASK-073 epic. Added
`apps/web/src/components/cover-letter-panel.tsx`, exporting `PresentationalCoverLetterPanel` — a
pure presentation component rendering the top-level `coverLetterPanel` `PipelineScreen` field: a
two-shape union, `{ text: string }` once a cover letter has been generated (mockup 12) or
`{ button: string }` before it's generated (mockup 13). The button variant reuses `ActionButton`
from `main-action-card.tsx` (`kind="primary"` hardcoded, since neither mockup example carries
`kind`/`reason` data for this field — unlike `actionsPanel.buttons[]`/`mainCard.buttons[]`, which
are full `MainActionButton` objects). The non-standard `PresentationalCoverLetterPanel` name (every
other epic component is named directly after its data field) was chosen during a same-session
`/code-review` pass that found the plain name `CoverLetterPanel` collided with an already-existing,
already-wired component of the same name at
`apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx` (pre-dating the epic); see the archived
task's "Progress Notes" for detail. Exact contract extracted from mockups 12/13's
`<script type="text/x-dc">` `renderVals()` blocks via `node -e`. New types (`CoverLetterPanelData`,
`CoverLetterPanelTextData`, `CoverLetterPanelButtonData`) added to `apps/web/src/lib/types.ts`. Not
wired into `/workspaces/[id]` in this task. 205/205 `apps/web` tests pass (2 new in
`cover-letter-panel.spec.tsx`). No manual visual check performed — no dev server started, since the
component only reuses `MainActionCard`/`ActionsPanel`'s already visually-verified `ActionButton`
styling plus a plain `<p>` for the text variant. Archived verbatim to
`project-management/completed-tasks/TASK-088-cover-letter-panel.md`.
