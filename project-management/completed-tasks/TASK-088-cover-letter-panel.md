# Current Task

## TASK-088: Component: CoverLetterPanel

Ninth component sub-task of the TASK-073 epic (full `apps/web` redesign). Raised while reading
mockups "12 - COVER LETTER - Generated final" and "13 - FINAL CHECK PDF - Ready": the
`PipelineScreen` contract has a top-level `coverLetterPanel` field, not covered by any of the
eight components already built (TASK-075–079, TASK-084, TASK-085, TASK-087).

### Context

Epic TASK-073 branches off `task/TASK-073-redesign-base`. Already merged into that base:
TASK-075 (PipelineStages), TASK-076 (WorkspaceStatusHeader), TASK-077 (MainActionCard), TASK-078
(ArtifactList/ArtifactCard), TASK-079 (WorkspaceForm), TASK-080 (`/workspaces/new` assembly),
TASK-081 (`/workspaces/[id]` assembly), TASK-082 (`/workspaces` list assembly), TASK-083 (real
backend data mapping in `pipeline-view-model.ts`), TASK-084 (ChecksPanel, PR #150), TASK-085
(UpcomingStepsPanel, PR #151), TASK-087 (ActionsPanel, PR #152, merged 2026-08-02).

Per ADR-025's process note: checked `gh pr list --base task/TASK-073-redesign-base` before
branching — no open PRs into the base branch, so `task/TASK-088-cover-letter-panel` was branched
immediately off the up-to-date base.

### Exact contract (extracted via `node -e` from both mockups' `<script type="text/x-dc">` blocks,
not guessed from a screenshot)

```js
// docs/mockups/12-cover-letter-generated-final.html (after generation)
coverLetterPanel: { text: 'Generated cover letter is available in the Artifacts section above.' }

// docs/mockups/13-final-check-pdf-ready.html (before generation)
coverLetterPanel: { button: 'Generate cover letter' }
```

`coverLetterPanel` is a two-shape union: `{ text: string }` or `{ button: string }`. Unlike
`actionsPanel.buttons[]`/`mainCard.buttons[]`, the `button` field here is a **plain label string**,
not a `MainActionButton { label, kind, reason }` object — there is no `kind`/`reason` data in
either mockup example. No other fields or variants exist in the mockups (each occurs exactly once
across all mockup files).

### Files Affected

- `apps/web/src/lib/types.ts` — add:
  ```ts
  export interface CoverLetterPanelTextData {
    text: string;
  }

  export interface CoverLetterPanelButtonData {
    button: string;
  }

  export type CoverLetterPanelData = CoverLetterPanelTextData | CoverLetterPanelButtonData;
  ```
- `apps/web/src/components/cover-letter-panel.tsx` (new) — pure presentation component
- `apps/web/src/components/cover-letter-panel.spec.tsx` (new)

Not wired into `/workspaces/[id]` (TASK-081) in this task — same pattern as TASK-075–079/084/085/087.

### Docs to Read

- `docs/mockups/12-cover-letter-generated-final.html` and
  `docs/mockups/13-final-check-pdf-ready.html` `<script type="text/x-dc">` blocks — contract
  already extracted above.
- `apps/web/src/components/main-action-card.tsx` — exported `ActionButton` component (TASK-077/087)
  to reuse for the button variant, `kind="primary"` hardcoded since the mockup data has no `kind`.
- `apps/web/src/lib/types.ts` lines ~48–54 — existing `ActionButtonKind`/`MainActionButton`, for
  context on why `coverLetterPanel.button` does *not* reuse that shape directly.

### Key Invariants

- `CoverLetterPanel` is a pure presentation component: it receives `coverLetterPanel` as a prop and
  an `onAction(label: string)` callback (used only for the button variant), same pattern as
  `MainActionCard`/`ActionsPanel`. It does not decide which variant to show and does not call any
  API itself — the real "generate cover letter" API call is a future real-data-wiring task, not
  this one.
- Reuse `ActionButton` from `main-action-card.tsx` for the button variant rather than hand-rolling a
  new `<button>` — keeps visual consistency with `MainActionCard`/`ActionsPanel`. `kind` is
  hardcoded to `"primary"` since the mockup data carries no kind information for this field.
- The `text` variant renders the string as-is (no hardcoded literal) — same "no hardcoded copy"
  rule as TASK-085's status strings.

### Acceptance Criteria

- [x] Renders `coverLetterPanel.text` as plain text when the `text` variant is passed.
- [x] Renders a primary `ActionButton` with `coverLetterPanel.button` as its label when the
      `button` variant is passed.
- [x] Clicking the button calls the passed-in `onAction(label)` callback; no real API call happens
      inside the component.
- [x] Renders correctly against both the mockup-12 and mockup-13 exact examples.

### Test Requirement

`cover-letter-panel.spec.tsx` (Vitest + RTL): both variants (mockup-12 `text`, mockup-13
`button`), plus explicit click-callback coverage for the button variant.

### Done Definition

`CoverLetterPanel` can be dropped onto a page with a mock `coverLetterPanel` prop (either variant)
and renders/clicks correctly independent of real workspace data.

### Git Instructions

1. `git add <files>`
2. `git commit -m "feat: TASK-088 ..."`
3. `git push -u origin task/TASK-088-cover-letter-panel`
4. `gh pr create --title "..." --body "..." --base task/TASK-073-redesign-base`
5. Stop completely. Do not select the next task automatically.

### Progress Notes

A same-session `/code-review` on the initial implementation found that the new component's export
name, `CoverLetterPanel`, collided with an already-existing, already-wired component of the exact
same name at `apps/web/src/app/workspaces/[id]/cover-letter-panel.tsx` (pre-dating the TASK-073
epic — it calls `generateCoverLetterAction` itself and decides its own visibility from
`status`/`artifacts`). This was missed during planning because the plan only checked the mockups'
data contract, not the existing component tree, for a name collision. Fixed by renaming the new
epic component to `PresentationalCoverLetterPanel` (both in `cover-letter-panel.tsx` and its spec)
— the originally-planned `Files Affected` list above still holds (same two files, same file names),
just with the exported identifier renamed. A code comment on the component now documents why the
non-standard name was chosen, for future readers who might otherwise "fix" it back to match the
rest of the epic's naming pattern. 205/205 `apps/web` tests still pass, `tsc`/`lint` still clean
after the rename.

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
