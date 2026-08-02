# Current Task

## TASK-087: Component: ActionsPanel (secondary pipeline step-trigger actions)

Eighth component sub-task of the TASK-073 epic (full `apps/web` redesign). Raised while reading
mockup "10 - SKIP - Confirm skip": the `PipelineScreen` contract has a top-level `actionsPanel`
field, separate from `mainCard`, not covered by any of the seven components already built
(TASK-075–079, TASK-084, TASK-085).

### Context

Epic TASK-073 branches off `task/TASK-073-redesign-base`. Already merged into that base:
TASK-075 (PipelineStages), TASK-076 (WorkspaceStatusHeader), TASK-077 (MainActionCard), TASK-078
(ArtifactList/ArtifactCard), TASK-079 (WorkspaceForm), TASK-080 (`/workspaces/new` assembly),
TASK-081 (`/workspaces/[id]` assembly), TASK-082 (`/workspaces` list assembly), TASK-083 (real
backend data mapping in `pipeline-view-model.ts`), TASK-084 (ChecksPanel, PR #150), TASK-085
(UpcomingStepsPanel, PR #151, merged 2026-07-31).

Per ADR-025's process note: checked `gh pr list --base task/TASK-073-redesign-base` before
branching — no open PRs into the base branch, so `task/TASK-087-actions-panel` was branched
immediately off the up-to-date base.

### Exact contract (extracted via `node -e` from `docs/mockups/10-skip-confirm-skip.html`'s
`<script type="text/x-dc">` block, not guessed from a screenshot)

```js
actionsPanel: { title: 'Pipeline actions', buttons: [ { label: 'Confirm skip', kind: 'primary' } ] }
```

`buttons[].kind` reuses the existing `ActionButtonKind` union (`apps/web/src/lib/types.ts`:
`"primary" | "secondary" | "disabled"`) and the existing `MainActionButton` shape
(`label`, `kind`, optional `reason`) already used by `MainActionCard` (TASK-077). This is the
only real example in the mockups (`grep -c actionsPanel docs/mockups/*.html` confirms exactly one
match, in mockup 10) — no other fields or variants are invented.

### Files Affected

- `apps/web/src/lib/types.ts` — add `ActionsPanelData { title: string; buttons: MainActionButton[] }`
- `apps/web/src/components/main-action-card.tsx` — export the existing internal `ActionButton`
  component (and its `buttonKindClasses` styling map) so `ActionsPanel` reuses the exact same
  button/kind visual pattern instead of duplicating badge/kind-class logic from scratch.
- `apps/web/src/components/actions-panel.tsx` (new) — pure presentation component
- `apps/web/src/components/actions-panel.spec.tsx` (new)

Not wired into `/workspaces/[id]` (TASK-081) in this task — same pattern as TASK-075–079/084/085.

### Docs to Read

- `docs/mockups/10-skip-confirm-skip.html` `<script type="text/x-dc">` block — contract already
  extracted above.
- `apps/web/src/components/main-action-card.tsx` + `.spec.tsx` (TASK-077) — source of the button
  kind→style pattern (`buttonKindClasses`, disabled+reason handling via wrapping `<span title>`).
- `apps/web/src/lib/types.ts` lines ~48–54 — existing `ActionButtonKind`/`MainActionButton`.

### Key Invariants

- `ActionsPanel` is a pure presentation component: it receives `actionsPanel` as a prop and an
  `onAction(label: string)` callback, same pattern as `MainActionCard`. It does not decide when to
  render buttons and does not call any API itself — the real `POST :id/confirm-skip` call is a
  future real-data-wiring task, not this one.
- Reuse `MainActionCard`'s `ActionButton`/`buttonKindClasses` rather than reimplementing
  kind-to-style mapping — keeps the two panels visually consistent by construction.

### Acceptance Criteria

- [x] Renders `actionsPanel.title`.
- [x] Renders `actionsPanel.buttons[]` with the same visual pattern for `kind`
      (primary/secondary/disabled+reason) as `MainActionCard`.
- [x] Clicking a button calls the passed-in `onAction(label)` callback; no real API call happens
      inside the component.
- [x] Renders correctly against the exact mockup-10 example.

### Test Requirement

`actions-panel.spec.tsx` (Vitest + RTL): mockup-10 fixture, plus explicit coverage of each
`kind` (primary/secondary/disabled) and the click callback (including disabled-click no-op).

### Done Definition

`ActionsPanel` can be dropped onto a page with a mock `actionsPanel` prop and renders/clicks
correctly independent of real workspace data.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-087 ..."`
3. `git push -u origin task/TASK-087-actions-panel`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

### Progress Notes

A same-session `/code-review` on the initial implementation found two minor issues: (1) the
button-row `<div>` + `.map()` JSX block was duplicated verbatim between `main-action-card.tsx` and
the new `actions-panel.tsx` instead of being shared, risking visual drift if the row layout ever
changes; (2) `key={button.label}` (copied from `MainActionCard`'s existing pattern) is not
guaranteed unique if a `buttons[]` payload ever contains two buttons with the same label. Fixed by
extracting a new exported `ActionButtonRow` component in `main-action-card.tsx` (wraps
`ActionButton`'s `.map()`, keyed by `` `${button.label}-${index}` ``) and using it from both
`MainActionCard` and `ActionsPanel` — the originally-planned `Files Affected` list above still
holds, just with an extra small addition to `main-action-card.tsx` beyond exporting `ActionButton`
alone. 203/203 `apps/web` tests still pass, `tsc`/`lint` still clean after the fix.

## Previously completed: TASK-085

Seventh component sub-task of the TASK-073 epic. Added
`apps/web/src/components/upcoming-steps-panel.tsx`, a pure presentation component rendering the
top-level `upcoming` `PipelineScreen` field: `finalCheck.status` and `coverLetter.status` (short
status strings, rendered as-is for any value — not hardcoded to the mockup's `'Not started'`
literal) plus `tracking.fields[]` (a static, order-preserving preview list of the future
application-tracking form's field labels — not the form itself, which is TASK-089's
`TrackingPanel`). Exact contract extracted from mockup 09's `<script type="text/x-dc">`
`renderVals()` block via `node -e`. New types (`UpcomingStepsData`, `UpcomingStepStatus`,
`UpcomingTrackingData`) added to `apps/web/src/lib/types.ts`. Not wired into `/workspaces/[id]` in
this task. 199/199 `apps/web` tests pass (4 new in `upcoming-steps-panel.spec.tsx`, including an
explicit alternate-status test proving no literal is hardcoded). Manual visual check used a
temporary preview route (deleted before commit) against the already-running dev server; no
automated screenshot tool available in this environment, so the project owner opened the page
directly and confirmed correct rendering via screenshot. Archived verbatim to
`project-management/completed-tasks/TASK-085-upcoming-steps-panel.md`.
