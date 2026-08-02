# Current Task

No active task selected — per CLAUDE.md Operating Rules, the next task is not chosen
automatically. See `project-management/TASK_BOARD.md` "Current Focus" for the recommended next
task and full epic status.

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

## Previously completed: TASK-087

Eighth component sub-task of the TASK-073 epic. Added `apps/web/src/components/actions-panel.tsx`,
a pure presentation component rendering the top-level `actionsPanel` `PipelineScreen` field
(`title` + `buttons[]`), the "secondary pipeline step-trigger actions" card distinct from
`mainCard`. Reuses a new `ActionButtonRow` component exported from
`apps/web/src/components/main-action-card.tsx` (which itself wraps the already-existing
`ActionButton`, also newly exported) for the `kind` (primary/secondary/disabled+reason) button
row, rather than duplicating that JSX. `ActionButtonRow` was extracted during a same-session
`/code-review` pass that found the button-row block duplicated between the two components and the
`key={button.label}` pattern (copied from `MainActionCard`) not collision-safe — fixed by sharing
one component keyed by `` `${label}-${index}` ``; see the archived task's "Progress Notes" for
detail. New `ActionsPanelData` type added to `apps/web/src/lib/types.ts`, reusing the existing
`MainActionButton`/`ActionButtonKind` types. Not wired into `/workspaces/[id]` in this task. Exact
contract extracted from mockup 10's `<script type="text/x-dc">` block via `node -e` (`grep -c
actionsPanel docs/mockups/*.html` confirmed exactly one match). 203/203 `apps/web` tests pass (4
new in `actions-panel.spec.tsx`). No manual visual check performed — no dev server started, since
the component only reuses `MainActionCard`'s already visually-verified button styling. Archived
verbatim to `project-management/completed-tasks/TASK-087-actions-panel.md`.
