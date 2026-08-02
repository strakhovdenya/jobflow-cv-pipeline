# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

## Last completed: TASK-089

Tenth component sub-task of the TASK-073 epic. Added `apps/web/src/components/tracking-panel.tsx`,
exporting `PresentationalTrackingPanel` — a pure presentation component rendering the top-level
`trackingPanel` `PipelineScreen` field: `{ textFields: [{ label }], selectFields: [{ label, value }] }`,
identical in shape across mockups 12 and 13 (only `selectFields[].value` differs between them).
Renders each `textFields[]` entry as a labeled read-only input and each `selectFields[]` entry as a
labeled disabled select pre-set to its `value`. The non-standard `PresentationalTrackingPanel` name
was chosen up front (not discovered mid-task like TASK-088's `PresentationalCoverLetterPanel`) —
before starting, `Glob` confirmed a fully-wired `ApplicationTrackingPanel` already exists at
`apps/web/src/app/workspaces/[id]/application-tracking-panel.tsx` (own state, server actions, own
`ArtifactSelect`), so the collision was avoided rather than fixed after the fact. Exact contract
extracted from mockups 12/13's `<script type="text/x-dc">` `renderVals()` blocks via `node -e`. New
types (`TrackingPanelData`, `TrackingTextField`, `TrackingSelectField`) added to
`apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in this task. This closes out the
epic's planned component sub-tasks — every component (TASK-075–079/084/085/087/088/089) is now
built; only TASK-074 (sequenced last) and the epic's final PR into `main` remain. A same-session
`/code-review` found one bug: both `textFields.map`/`selectFields.map` keyed rows and derived each
input/select `id` purely from `field.label`, with no index fallback — two same-labeled fields would
collide on both React `key` and DOM `id` (breaking the `<label htmlFor>` association for the
second), the same class of bug already fixed once in `main-action-card.tsx`/`ActionsPanel`
(TASK-087, `` `${label}-${index}` ``). Fixed by applying the identical `` `${label}-${index}` ``
pattern here. 207/207 `apps/web` tests pass (2 new in `tracking-panel.spec.tsx`, re-verified after
the fix). No manual visual check performed — no dev server started, since the component only reuses
`WorkspaceForm`/`main-action-card.tsx`'s already visually-verified input/select Tailwind classes.
Archived verbatim to `project-management/completed-tasks/TASK-089-tracking-panel.md`.

## Previously completed: TASK-088

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
